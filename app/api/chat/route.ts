import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOpenAIClient } from "@/lib/openai/client";
import type { Answers, TranscriptMessage } from "@/lib/types";
import {
  buildChatSystemPrompt,
  formatRetrievedContext,
  retrieveChunks,
  uniqueSources,
} from "@/lib/rag/retrieve";
import {
  answerWithWebSearch,
  resolveChatModel,
} from "@/lib/rag/web-search";
import { sanitizeChatReply } from "@/lib/rag/sanitize-reply";
import { extractAnswersFromMessage } from "@/lib/conversation/extract-answers";
import {
  buildChatIntakeState,
  detectSellEstimateIntent,
  getChatExtractableSteps,
  heuristicChatAddress,
} from "@/lib/rag/chat-intake";

/** Keep enough turns so follow-ups ("that area", "compare to…") still resolve. */
const MAX_HISTORY = 24;
/** Cap each turn so the web_search prompt stays within context. */
const MAX_TURN_CHARS = 1200;

function now() {
  return new Date().toISOString();
}

type ChatSource = {
  title: string;
  region: string | null;
  status: string | null;
  property_type: string | null;
  source_file: string;
  kind?: "comp" | "web";
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const message =
      typeof body.message === "string" ? body.message.trim() : "";
    const locale = body.locale === "fr" ? "fr" : "en";
    const requestId =
      typeof body.requestId === "string" && body.requestId.trim()
        ? body.requestId.trim()
        : `req-${Date.now()}`;
    let sessionId =
      typeof body.sessionId === "string" && body.sessionId
        ? body.sessionId
        : null;

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (sessionId) {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id, transcript, answers, lead_type")
        .eq("id", sessionId)
        .maybeSingle();
      if (!existing) sessionId = null;
    }

    if (!sessionId) {
      const { data: created, error: createErr } = await supabase
        .from("conversations")
        .insert({
          status: "in_progress",
          transcript: [],
          answers: { locale, inputMode: "chat", chatRequestId: requestId },
          lead_type: "chat",
          locale,
        })
        .select("id")
        .single();

      if (createErr || !created) {
        const { data: fallback, error: fbErr } = await supabase
          .from("conversations")
          .insert({
            status: "in_progress",
            transcript: [],
            answers: {
              locale,
              inputMode: "chat",
              leadType: "chat",
              chatRequestId: requestId,
            },
            locale,
          })
          .select("id")
          .single();
        if (fbErr || !fallback) {
          console.error("chat session create failed:", createErr || fbErr);
          return NextResponse.json(
            { error: "Could not start chat session" },
            { status: 500 }
          );
        }
        sessionId = fallback.id;
      } else {
        sessionId = created.id;
      }
    }

    const { data: session, error: loadErr } = await supabase
      .from("conversations")
      .select("id, transcript, answers")
      .eq("id", sessionId)
      .single();

    if (loadErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const transcript = Array.isArray(session.transcript)
      ? (session.transcript as TranscriptMessage[])
      : [];

    const prevAnswers: Answers = {
      ...((session.answers as Answers) || {}),
    };

    // Claim this turn so a superseded amend does not overwrite transcript later
    await supabase
      .from("conversations")
      .update({
        answers: {
          ...prevAnswers,
          locale,
          inputMode: "chat",
          chatRequestId: requestId,
        },
      })
      .eq("id", sessionId);

    const history = transcript
      .filter((m) => m.from === "user" || m.from === "ai")
      .slice(-MAX_HISTORY)
      .map((m) => {
        const raw = (m.text || "").trim();
        const content =
          raw.length > MAX_TURN_CHARS
            ? `${raw.slice(0, MAX_TURN_CHARS)}…`
            : raw;
        return {
          role: (m.from === "user" ? "user" : "assistant") as
            | "user"
            | "assistant",
          content,
        };
      })
      .filter((m) => m.content.length > 0);

    // Extract seller slots into answers (reuse valuation extractor)
    let mergedAnswers: Answers = { ...prevAnswers };
    const openSteps = getChatExtractableSteps(mergedAnswers);
    if (openSteps.length > 0) {
      try {
        const { extracted } = await extractAnswersFromMessage({
          message,
          locale,
          openSteps,
          alreadyAnswered: mergedAnswers,
        });
        mergedAnswers = { ...mergedAnswers, ...extracted };
      } catch (err) {
        console.warn("[chat] slot extract failed:", err);
      }
    }
    const addrBits = heuristicChatAddress(message, mergedAnswers);
    mergedAnswers = { ...mergedAnswers, ...addrBits };

    const intakeMode = detectSellEstimateIntent({
      message,
      history,
      answers: mergedAnswers,
    });
    if (intakeMode) {
      mergedAnswers._chatIntake = "1";
    }

    const intake = buildChatIntakeState({
      answers: mergedAnswers,
      locale,
      intakeMode,
    });

    const userMsg: TranscriptMessage = {
      from: "user",
      text: message,
      at: now(),
    };

    // RAG query: prefer address + known facts for comps when in intake
    const ragQuery =
      intakeMode && mergedAnswers.streetAddress
        ? [
            mergedAnswers.streetAddress,
            mergedAnswers.city,
            mergedAnswers.propertyType,
            mergedAnswers.bedrooms
              ? `${mergedAnswers.bedrooms} bedrooms`
              : "",
            message,
          ]
            .filter(Boolean)
            .join(" ")
        : message;

    let chunks: Awaited<ReturnType<typeof retrieveChunks>> = [];
    try {
      chunks = await retrieveChunks(ragQuery, { matchCount: 8 });
    } catch (err) {
      console.warn("[chat] RAG retrieve failed (continuing with web):", err);
    }
    const compsContext = formatRetrievedContext(chunks);
    const compSources: ChatSource[] = uniqueSources(chunks).map((s) => ({
      ...s,
      kind: "comp" as const,
    }));

    // Option 2: Responses API + web_search
    const web = await answerWithWebSearch({
      message,
      locale,
      compsContext,
      history,
      intake,
    });

    let reply = web.text;
    let via: "web_search" | "comps_only" | "failed" = "failed";
    const sources: ChatSource[] = [...compSources];

    if (web.via === "web_search" && web.text) {
      via = "web_search";
      for (const url of web.sources) {
        let title = url;
        try {
          title = new URL(url).hostname.replace(/^www\./, "");
        } catch {
          /* keep url */
        }
        sources.push({
          title,
          region: null,
          status: null,
          property_type: null,
          source_file: url,
          kind: "web",
        });
      }
    } else {
      // Fallback: chat completions on comps only (no browse)
      try {
        const openai = createOpenAIClient();
        const model = resolveChatModel();
        const completion = await openai.chat.completions.create({
          model,
          temperature: 0.3,
          messages: [
            { role: "system", content: buildChatSystemPrompt(locale, intake) },
            {
              role: "system",
              content: `Reference material (use silently if helpful; never say it was missing):\n\n${compsContext}\n\nIntake state:\n${intake.stateBlock}`,
            },
            ...history,
            { role: "user", content: message },
          ],
        });
        reply =
          completion.choices[0]?.message?.content?.trim() ||
          (locale === "fr"
            ? "Je n'ai pas pu générer de réponse pour le moment."
            : "I couldn't generate a reply right now.");
        via = "comps_only";
      } catch (err) {
        console.error("[chat] comps-only fallback failed:", err);
        reply =
          locale === "fr"
            ? "Je n'ai pas pu générer de réponse pour le moment (crédits API ou erreur modèle)."
            : "I couldn't generate a reply right now (API credits or model error).";
        via = "failed";
      }
    }

    reply = sanitizeChatReply(reply);

    const aiMsg: TranscriptMessage = {
      from: "ai",
      text: reply,
      at: now(),
    };

    // If the user amended while we were thinking, a newer request claimed the session
    const { data: latest } = await supabase
      .from("conversations")
      .select("answers, transcript")
      .eq("id", sessionId)
      .maybeSingle();
    const latestAnswers = (latest?.answers as Answers) || {};
    if (
      latestAnswers.chatRequestId &&
      latestAnswers.chatRequestId !== requestId
    ) {
      return NextResponse.json({
        ok: true,
        sessionId,
        superseded: true,
        requestId,
      });
    }

    const baseTranscript = Array.isArray(latest?.transcript)
      ? (latest!.transcript as TranscriptMessage[])
      : transcript;

    const nextTranscript = [...baseTranscript, userMsg, aiMsg];
    const nextAnswers: Answers = {
      ...mergedAnswers,
      locale,
      inputMode: "chat",
      chatRequestId: requestId,
      lastSources: JSON.stringify(sources),
      lastVia: via,
      enoughForEstimate: intake.enoughForEstimate ? "1" : "0",
    };

    await supabase
      .from("conversations")
      .update({
        transcript: nextTranscript,
        answers: nextAnswers,
        lead_type: "chat",
        locale,
      })
      .eq("id", sessionId);

    // Client feedback: do not show references/sources in the chat UI.
    // Keep lastSources in answers for admin/debug only.
    return NextResponse.json({
      ok: true,
      sessionId,
      reply,
      sources: [],
      via,
      model: resolveChatModel(),
      at: aiMsg.at,
      requestId,
      intake: {
        mode: intake.intakeMode,
        enoughForEstimate: intake.enoughForEstimate,
        missing: intake.missingIds.slice(0, 6),
      },
    });
  } catch (err) {
    console.error("POST /api/chat failed:", err);
    const msg = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, transcript, answers, locale, status, created_at, updated_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ session: data });
}
