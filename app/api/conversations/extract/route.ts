import { NextResponse } from "next/server";
import {
  buildAlsoNotedNote,
  extractAnswersFromMessage,
  type ExtractableStep,
} from "@/lib/conversation/extract-answers";
import { normalizeLocale } from "@/lib/i18n/copy";
import type { Answers } from "@/lib/types";

/**
 * Extract multiple structured answers from one natural-language message
 * so the chat can skip questions the user already answered.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message =
      typeof body.message === "string" ? body.message.trim() : "";
    const locale = normalizeLocale(body.locale);
    const openSteps = Array.isArray(body.openSteps)
      ? (body.openSteps as ExtractableStep[])
      : [];
    const alreadyAnswered =
      body.alreadyAnswered && typeof body.alreadyAnswered === "object"
        ? (body.alreadyAnswered as Answers)
        : {};

    if (!message || openSteps.length === 0) {
      return NextResponse.json({
        ok: true,
        extracted: {},
        note: "",
        via: "none",
      });
    }

    const limit =
      typeof body.limit === "number" && body.limit > 0
        ? Math.min(body.limit, 50)
        : 20;

    const { extracted, via } = await extractAnswersFromMessage({
      message,
      locale,
      openSteps: openSteps.slice(0, limit),
      alreadyAnswered,
    });

    const note = buildAlsoNotedNote(extracted, locale);

    return NextResponse.json({ ok: true, extracted, note, via });
  } catch (err) {
    console.error("Extract answers failed:", err);
    return NextResponse.json(
      { ok: false, error: "Could not extract answers", extracted: {} },
      { status: 500 }
    );
  }
}
