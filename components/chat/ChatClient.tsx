"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Home, Send, Loader2, Sparkles } from "lucide-react";
import { ChatRichText } from "@/components/chat/ChatRichText";

const SESSION_KEY = "estate-valora-chat-session";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: string;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ChatClient({
  initialLocale = "en",
}: {
  initialLocale?: "en" | "fr";
}) {
  const [locale, setLocale] = useState<"en" | "fr">(initialLocale);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  /** Keep latest session id for send (avoids losing history when state lags). */
  const sessionIdRef = useRef<string | null>(null);

  const copy =
    locale === "fr"
      ? {
          title: "Assistant Estate Valora",
          subtitle:
            "Comparables Estate Valora + recherche web marché (comme ChatGPT).",
          placeholder:
            "Ex. Prix moyen des unifamiliales à Saint-Léonard? Ou Fontainebleau?",
          send: "Envoyer",
          empty:
            "Demandez des moyennes de quartier, des tendances ou une fourchette pour une maison. J’utilise vos PDFs et le web.",
          try: "Essayez",
          valuation: "Estimation guidée →",
          newChat: "Nouvelle conversation",
          disclaimer:
            "Aperçu préliminaire IA — pas une évaluation certifiée. Sous réserve de révision par Ashkan Shamloo.",
          starters: [
            "Quel est le prix moyen d’une unifamiliale à Saint-Léonard?",
            "Combien pourrait valoir une maison détachée 4 chambres sur le boulevard Lacordaire à Saint-Léonard?",
            "Quel est le prix moyen des maisons à Fontainebleau?",
          ],
        }
      : {
          title: "Estate Valora assistant",
          subtitle:
            "Estate Valora comps + live web market search (ChatGPT-style).",
          placeholder:
            "e.g. Average single-family price in Saint-Léonard? Or Fontainebleau?",
          send: "Send",
          empty:
            "Ask for neighbourhood averages, trends, or a range for a specific home. I use your PDFs and the web.",
          try: "Try",
          valuation: "Guided valuation →",
          newChat: "New chat",
          disclaimer:
            "Preliminary AI insight — not a certified appraisal. Subject to review by Ashkan Shamloo.",
          starters: [
            "What’s the average single-family home price in Saint-Léonard?",
            "What could a 4-bed detached on Boulevard Lacordaire in Saint-Léonard be worth?",
            "What’s the average house price in Fontainebleau?",
          ],
        };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        sessionIdRef.current = stored;
        setSessionId(stored);
      }
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/chat?sessionId=${sessionId}`);
        if (!res.ok) {
          // Stale / deleted session — start fresh next send
          if (res.status === 404) {
            try {
              localStorage.removeItem(SESSION_KEY);
            } catch {
              /* */
            }
            if (!cancelled) {
              sessionIdRef.current = null;
              setSessionId(null);
            }
          }
          return;
        }
        const data = await res.json();
        const transcript = data.session?.transcript;
        if (!Array.isArray(transcript) || cancelled) return;
        const restored: ChatMessage[] = [];
        for (const m of transcript) {
          if (m.from === "user") {
            restored.push({
              id: uid(),
              role: "user",
              text: m.text,
              at: m.at || new Date().toISOString(),
            });
          } else if (m.from === "ai") {
            restored.push({
              id: uid(),
              role: "assistant",
              text: m.text,
              at: m.at || new Date().toISOString(),
            });
          }
        }
        if (restored.length) setMessages(restored);
      } catch {
        /* ignore restore errors */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  function resetChat() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* */
    }
    sessionIdRef.current = null;
    setSessionId(null);
    setMessages([]);
    setError(null);
  }

  async function sendMessage(raw: string) {
    const text = raw.trim();
    if (!text || sending) return;

    setInput("");
    setError(null);
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      text,
      at: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          locale,
          // Ref is always current — React state can lag one send behind
          sessionId: sessionIdRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Chat failed");
      }
      if (data.sessionId) {
        sessionIdRef.current = data.sessionId;
        setSessionId(data.sessionId);
        try {
          localStorage.setItem(SESSION_KEY, data.sessionId);
        } catch {
          /* */
        }
      }
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          text: data.reply,
          at: data.at || new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setSending(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await sendMessage(input);
  }

  return (
    <div className="relative w-full h-[100dvh] bg-background overflow-hidden notranslate">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background: `
            radial-gradient(ellipse 45% 60% at 0% 40%, rgba(183,172,127,0.07), transparent 55%),
            radial-gradient(ellipse 40% 50% at 100% 70%, rgba(44,156,197,0.05), transparent 50%),
            linear-gradient(180deg, #07090b 0%, #0a0d11 50%, #07090b 100%)
          `,
        }}
      />

      <div className="relative page-container h-full py-3 sm:py-4 md:py-6 flex flex-col min-h-0">
        <div className="flex-1 min-w-0 rounded-md border border-white/10 bg-surface/90 backdrop-blur-sm flex flex-col overflow-hidden min-h-0 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="px-4 sm:px-6 py-3.5 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/"
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0"
                aria-label="Home"
              >
                <Home size={14} className="text-background" />
              </Link>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-foreground truncate flex items-center gap-2">
                  <Sparkles size={14} className="text-electric shrink-0" />
                  {copy.title}
                </p>
                
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`px-2.5 py-1 rounded-full text-[11px] border ${
                  locale === "en"
                    ? "border-electric/40 bg-electric/15 text-electric"
                    : "border-white/10 text-foreground-muted"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLocale("fr")}
                className={`px-2.5 py-1 rounded-full text-[11px] border ${
                  locale === "fr"
                    ? "border-electric/40 bg-electric/15 text-electric"
                    : "border-white/10 text-foreground-muted"
                }`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={resetChat}
                className="hidden sm:inline text-[12px] text-foreground-subtle hover:text-foreground-muted px-2"
              >
                {copy.newChat}
              </button>
              <Link
                href="/valuation"
                className="text-[12px] text-electric hover:underline whitespace-nowrap"
              >
                {copy.valuation}
              </Link>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 space-y-3"
          >
            {messages.length === 0 && (
              <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center gap-4 px-4">
                <p className="text-[15px] text-foreground-muted max-w-md leading-relaxed">
                  {copy.empty}
                </p>
                <div className="w-full max-w-lg space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-foreground-subtle">
                    {copy.try}
                  </p>
                  <div className="flex flex-col gap-2">
                    {copy.starters.map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        disabled={sending}
                        onClick={() => void sendMessage(starter)}
                        className="w-full text-left rounded-md border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px] sm:text-[14px] text-foreground-muted hover:border-electric/40 hover:text-foreground hover:bg-electric/10 transition-colors disabled:opacity-50"
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-foreground-subtle max-w-sm">
                  {copy.disclaimer}
                </p>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[min(95%,40rem)] rounded-md px-3.5 sm:px-4 py-2.5 text-[14px] sm:text-[15px] leading-relaxed break-words ${
                    m.role === "user"
                      ? "rounded-tr-sm bg-electric/20 border border-electric/30 text-foreground whitespace-pre-wrap"
                      : "rounded-tl-sm bg-surface-soft border border-white/10 text-foreground"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <ChatRichText text={m.text} />
                  ) : (
                    m.text
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="rounded-md bg-surface-soft border border-white/10 px-4 py-3 flex items-center gap-2 text-[13px] text-foreground-muted">
                  <Loader2 size={14} className="animate-spin" />
                  …
                </div>
              </div>
            )}

            {error && (
              <p className="text-[12px] text-warm break-words">{error}</p>
            )}
          </div>

          <form
            onSubmit={onSubmit}
            className="border-t border-white/10 p-3 sm:p-4 shrink-0 bg-surface/95"
          >
            <div className="flex gap-2 max-w-3xl mx-auto">
              <textarea
                rows={2}
                value={input}
                disabled={sending}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void onSubmit(e as unknown as FormEvent);
                  }
                }}
                placeholder={copy.placeholder}
                className="flex-1 min-w-0 resize-none rounded-md border border-white/15 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-foreground outline-none placeholder:text-foreground-subtle focus:border-electric/60 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="self-end px-4 py-2.5 rounded-full bg-white text-background text-[13px] font-medium flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send size={14} />
                {copy.send}
              </button>
            </div>
            <p className="text-[10px] text-foreground-subtle text-center mt-2 max-w-3xl mx-auto">
              {copy.disclaimer}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
