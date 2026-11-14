import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOpenAIClient } from "@/lib/openai/client";
import type { TranscriptMessage } from "@/lib/types";
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

const MAX_HISTORY = 16;

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
          answers: { locale, inputMode: "chat" },
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
            answers: { locale, inputMode: "chat", leadType: "chat" },
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

    const userMsg: TranscriptMessage = {
      from: "user",
      text: message,
      at: now(),
    };

    // 1) RAG comps from client PDFs
    let chunks: Awaited<ReturnType<typeof retrieveChunks>> = [];
    try {
      chunks = await retrieveChunks(message, { matchCount: 8 });
    } catch (err) {
      console.warn("[chat] RAG retrieve failed (continuing with web):", err);
    }
    const compsContext = formatRetrievedContext(chunks);
    const compSources: ChatSource[] = uniqueSources(chunks).map((s) => ({
      ...s,
      kind: "comp" as const,
    }));

    const history = transcript
      .filter((m) => m.from === "user" || m.from === "ai")
      .slice(-MAX_HISTORY)
      .map((m) => ({
        role: (m.from === "user" ? "user" : "assistant") as
          | "user"
          | "assistant",
        content: m.text,
      }));

    // 2) Option 2: Responses API + web_search (ChatGPT-like market averages)
    const web = await answerWithWebSearch({
      message,
      locale,
      compsContext,
      history,
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
            { role: "system", content: buildChatSystemPrompt(locale) },
            {
              role: "system",
              content: `Reference material (use silently if helpful; never say it was missing):\n\n${compsContext}`,
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

    const nextTranscript = [...transcript, userMsg, aiMsg];
    const nextAnswers = {
      ...(session.answers || {}),
      locale,
      inputMode: "chat",
      lastSources: JSON.stringify(sources),
      lastVia: via,
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

    return NextResponse.json({
      ok: true,
      sessionId,
      reply,
      sources,
      via,
      model: resolveChatModel(),
      at: aiMsg.at,
    });
  } catch (err) {
    console.error("POST /api/chat failed:", err);
    const msg = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
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
