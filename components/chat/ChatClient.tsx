"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUp,
  BarChart3,
  CalendarDays,
  Home,
  Plus,
  Sparkles,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { ChatRichText } from "@/components/chat/ChatRichText";

const SESSION_KEY = "estate-valora-chat-session";
const HERO_SRC = "/images/chat-hero-dusk.jpg";

const STARTER_ICONS: LucideIcon[] = [Home, CalendarDays, TrendingUp, Wallet];

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: string;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function GoldStar({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-[linear-gradient(145deg,#e8d5a3,#c4a35a)] text-[#1a1510] shadow-[0_0_20px_rgba(215,168,102,0.35)] shrink-0 ${className}`}
      aria-hidden
    >
      <Sparkles size={14} strokeWidth={2.25} />
    </span>
  );
}

function FleurDeLis({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2c.4 1.6 1.2 2.8 2.4 3.6-.8.4-1.6.6-2.4.6S10.4 6 9.6 5.6C10.8 4.8 11.6 3.6 12 2zm0 5.2c1.2 0 2.3-.3 3.3-.9.6 1.3 1.7 2.3 3.1 2.7-.9 1.1-2.2 1.9-3.7 2.2.5 1.4 1.4 2.6 2.6 3.4-1.5.2-2.9-.1-4.1-.8v4.4h-2.4v-4.4c-1.2.7-2.6 1-4.1.8 1.2-.8 2.1-2 2.6-3.4-1.5-.3-2.8-1.1-3.7-2.2 1.4-.4 2.5-1.4 3.1-2.7 1 .6 2.1.9 3.3.9z" />
    </svg>
  );
}

function ThinkingBubble({
  locale,
  amending,
}: {
  locale: "en" | "fr";
  amending: boolean;
}) {
  const labels =
    locale === "fr"
      ? amending
        ? [
            "Je reprends avec vos précisions…",
            "Mise à jour en cours…",
            "Encore un instant…",
          ]
        : ["Je réfléchis…", "Je regarde le marché…", "Presque prêt…"]
      : amending
        ? [
            "Updating with your extra details…",
            "Re-checking…",
            "Almost there…",
          ]
        : ["Thinking…", "Checking the market…", "Almost there…"];

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % labels.length);
    }, 2200);
    return () => window.clearInterval(t);
  }, [labels.length]);

  return (
    <div className="flex justify-start gap-2.5 items-end">
      <GoldStar className="w-7 h-7" />
      <div className="rounded-2xl rounded-bl-md bg-white/[0.06] border border-white/10 px-4 py-3 flex items-center gap-3 text-[13px] text-white/70">
        <span className="flex items-center gap-1.5 text-[#d7a866]" aria-hidden>
          <span className="chat-thinking-dot" />
          <span className="chat-thinking-dot" />
          <span className="chat-thinking-dot" />
        </span>
        <span className="chat-thinking-label" key={labels[idx]}>
          {labels[idx]}
        </span>
      </div>
    </div>
  );
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
  const [amending, setAmending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const pendingUserIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const copy =
    locale === "fr"
      ? {
          brand: "Estate Valora",
          heroHeadlineBefore: "Découvrez ce que ",
          heroHeadlineAccent: "vaut",
          heroHeadlineAfter: " votre maison.",
          heroSub:
            "Perspective locale. Une prochaine étape plus claire. Explorez le potentiel de votre propriété avec votre assistant immobilier IA.",
          badgeQc: "Immobilier au Québec",
          badgeInsights: "Perspectives personnalisées",
          chatSubtitle: "Votre assistant immobilier intelligent.",
          placeholder: "Posez n’importe quelle question sur l’immobilier…",
          emptyTitle: "Comment puis-je vous aider avec votre propriété?",
          empty: "Explorez les valeurs, les tendances du marché et votre prochaine étape.",
          inviteBubble: "Posez une question. Trouvons votre prochaine étape.",
          orStart: "Ou commencez ici",
          selectPrompt: "Choisissez une suggestion ou écrivez la vôtre",
          newChat: "Nouvelle conversation",
          disclaimer: "Aperçus IA seulement. Pas une évaluation certifiée.",
          composingHint:
            "Vous pouvez continuer à écrire — Envoyer ajoute à votre dernier message.",
          starters: [
            "Quelle est la valeur de ma propriété aujourd’hui?",
            "Est-ce le bon moment pour vendre ma propriété?",
            "Comment évolue le marché immobilier dans mon quartier?",
            "Quel type de propriété puis-je acheter avec mon budget?",
          ],
        }
      : {
          brand: "Estate Valora",
          heroHeadlineBefore: "Discover what your home is ",
          heroHeadlineAccent: "worth",
          heroHeadlineAfter: ".",
          heroSub:
            "Local insight. A clearer next move. Explore your property’s potential with your AI real estate assistant.",
          badgeQc: "Québec real estate",
          badgeInsights: "Personalized insights",
          chatSubtitle: "Your intelligent real estate assistant.",
          placeholder: "Ask anything about real estate…",
          emptyTitle: "How can I help with your property?",
          empty: "Explore values, market trends, and your next move.",
          inviteBubble: "Ask a question. Let’s find your next move.",
          orStart: "Or start here",
          selectPrompt: "Select a prompt or write your own",
          newChat: "New chat",
          disclaimer: "AI insights only. Not a certified appraisal.",
          composingHint:
            "You can keep typing — Send adds to your last message.",
          starters: [
            "What is my property worth in today’s market?",
            "Is now a good time to sell my property?",
            "How has the real estate market changed in my neighbourhood?",
            "What can I afford with my home-buying budget?",
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
  }, [messages, sending, amending]);

  function resetChat() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* */
    }
    sessionIdRef.current = null;
    requestIdRef.current = null;
    pendingUserIdRef.current = null;
    setSessionId(null);
    setMessages([]);
    setError(null);
    setSending(false);
    setAmending(false);
  }

  async function postChat(args: {
    text: string;
    requestId: string;
  }): Promise<{
    ok: boolean;
    sessionId?: string;
    reply?: string;
    at?: string;
    superseded?: boolean;
    error?: string;
  }> {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: args.text,
        locale,
        sessionId: sessionIdRef.current,
        requestId: args.requestId,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || "Chat failed" };
    }
    return {
      ok: true,
      sessionId: data.sessionId,
      reply: data.reply,
      at: data.at,
      superseded: Boolean(data.superseded),
    };
  }

  async function sendMessage(raw: string) {
    const text = raw.trim();
    if (!text) return;

    setError(null);
    setInput("");

    if (sending && pendingUserIdRef.current) {
      const pendingId = pendingUserIdRef.current;
      let combined = text;
      setMessages((prev) => {
        const current = prev.find((m) => m.id === pendingId);
        if (!current) return prev;
        combined = `${current.text.trim()} ${text}`.replace(/\s+/g, " ").trim();
        return prev.map((m) =>
          m.id === pendingId ? { ...m, text: combined } : m
        );
      });

      const requestId = uid();
      requestIdRef.current = requestId;
      setAmending(true);
      queueMicrotask(() => inputRef.current?.focus());

      try {
        const data = await postChat({ text: combined, requestId });
        if (requestIdRef.current !== requestId) return;
        if (!data.ok) throw new Error(data.error || "Chat failed");
        if (data.superseded) return;
        if (data.sessionId) {
          sessionIdRef.current = data.sessionId;
          setSessionId(data.sessionId);
          try {
            localStorage.setItem(SESSION_KEY, data.sessionId);
          } catch {
            /* */
          }
        }
        if (data.reply) {
          setMessages((m) => [
            ...m,
            {
              id: uid(),
              role: "assistant",
              text: data.reply!,
              at: data.at || new Date().toISOString(),
            },
          ]);
        }
        pendingUserIdRef.current = null;
        setSending(false);
        setAmending(false);
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        setError(err instanceof Error ? err.message : "Chat failed");
        setSending(false);
        setAmending(false);
        pendingUserIdRef.current = null;
      }
      return;
    }

    if (sending) return;

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      text,
      at: new Date().toISOString(),
    };
    pendingUserIdRef.current = userMsg.id;
    setMessages((m) => [...m, userMsg]);
    setSending(true);
    setAmending(false);

    const requestId = uid();
    requestIdRef.current = requestId;
    queueMicrotask(() => inputRef.current?.focus());

    try {
      const data = await postChat({ text, requestId });
      if (requestIdRef.current !== requestId) return;
      if (!data.ok) throw new Error(data.error || "Chat failed");
      if (data.superseded) return;
      if (data.sessionId) {
        sessionIdRef.current = data.sessionId;
        setSessionId(data.sessionId);
        try {
          localStorage.setItem(SESSION_KEY, data.sessionId);
        } catch {
          /* */
        }
      }
      if (data.reply) {
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "assistant",
            text: data.reply!,
            at: data.at || new Date().toISOString(),
          },
        ]);
      }
      pendingUserIdRef.current = null;
      setSending(false);
      setAmending(false);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setError(err instanceof Error ? err.message : "Chat failed");
      setSending(false);
      setAmending(false);
      pendingUserIdRef.current = null;
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await sendMessage(input);
  }

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden notranslate bg-[#07080a] text-white">
      {/* Mobile backdrop hero */}
      <div className="lg:hidden absolute inset-0" aria-hidden>
        <Image
          src={HERO_SRC}
          alt=""
          fill
          priority
          className="object-cover opacity-40"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/85 to-[#07080a]" />
      </div>

      <div className="relative h-full flex flex-col lg:flex-row">
        {/* Left hero — desktop */}
        <aside className="hidden lg:flex relative w-[44%] xl:w-[46%] min-h-0 flex-col overflow-hidden">
          <Image
            src={HERO_SRC}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="46vw"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `
                linear-gradient(90deg, rgba(7,8,10,0.55) 0%, rgba(7,8,10,0.25) 45%, rgba(7,8,10,0.65) 100%),
                linear-gradient(180deg, rgba(7,8,10,0.55) 0%, transparent 35%, rgba(7,8,10,0.75) 100%)
              `,
            }}
          />

          <div className="relative z-10 flex flex-col h-full px-8 xl:px-12 py-8 xl:py-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-white/95 hover:text-white transition-colors w-fit cursor-pointer"
            >
              <span className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                <Home size={14} />
              </span>
              <span className="font-serif text-[18px] tracking-tight">
                {copy.brand}
              </span>
            </Link>

            <div className="flex-1 flex flex-col justify-center max-w-md xl:max-w-lg py-10">
              <h1 className="font-serif text-[2.6rem] xl:text-[3.15rem] leading-[1.12] tracking-tight text-white">
                {copy.heroHeadlineBefore}
                <em className="italic text-[#d7a866] font-serif">
                  {copy.heroHeadlineAccent}
                </em>
                {copy.heroHeadlineAfter}
              </h1>
              <p className="mt-5 text-[14px] xl:text-[15px] leading-relaxed text-white/75 max-w-sm">
                {copy.heroSub}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-[12px] text-white/70">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full border border-[#d7a866]/50 bg-[#d7a866]/10 flex items-center justify-center text-[#d7a866]">
                  <FleurDeLis className="w-4 h-4" />
                </span>
                <span>{copy.badgeQc}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full border border-[#d7a866]/50 bg-[#d7a866]/10 flex items-center justify-center text-[#d7a866]">
                  <BarChart3 size={14} />
                </span>
                <span>{copy.badgeInsights}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right chat column */}
        <div className="relative flex-1 min-w-0 min-h-0 flex flex-col p-0 sm:p-3 lg:p-5 xl:p-6 lg:pl-3">
          <div className="flex-1 min-h-0 rounded-none sm:rounded-2xl border-0 sm:border border-white/10 bg-[#12151a]/95 sm:bg-[#12151a]/92 backdrop-blur-md flex flex-col overflow-hidden shadow-none sm:shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_0_1px_rgba(215,168,102,0.06)]">
            {/* Chat header */}
            <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-white/[0.07] flex items-center justify-between gap-2 shrink-0">
              <Link
                href="/"
                className="flex items-center gap-2 sm:gap-2.5 min-w-0 cursor-pointer hover:opacity-90 transition-opacity"
              >
                <GoldStar className="w-8 h-8 sm:w-9 sm:h-9" />
                <div className="min-w-0">
                  <p className="text-[14px] sm:text-[15px] font-semibold text-white truncate leading-tight">
                    {copy.brand}
                  </p>
                  <p className="text-[10px] sm:text-[12px] text-white/50 truncate">
                    {copy.chatSubtitle}
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <div className="flex items-center rounded-full border border-white/10 bg-white/[0.03] p-0.5">
                  <button
                    type="button"
                    onClick={() => setLocale("en")}
                    className={`cursor-pointer px-2 sm:px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                      locale === "en"
                        ? "bg-[#d7a866]/20 text-[#e8d5a3]"
                        : "text-white/45 hover:text-white/70"
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocale("fr")}
                    className={`cursor-pointer px-2 sm:px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                      locale === "fr"
                        ? "bg-[#d7a866]/20 text-[#e8d5a3]"
                        : "text-white/45 hover:text-white/70"
                    }`}
                  >
                    FR
                  </button>
                </div>
                <button
                  type="button"
                  onClick={resetChat}
                  className="cursor-pointer inline-flex items-center gap-1 text-[12px] text-white/55 hover:text-white/85 px-1.5 sm:px-2 py-1.5 rounded-full border border-transparent hover:border-white/10 transition-colors"
                >
                  <Plus size={14} />
                  <span className="hidden sm:inline">{copy.newChat}</span>
                </button>
              </div>
            </div>

            {/* Thread */}
            <div
              ref={scrollRef}
              className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 py-3 sm:py-5 space-y-3"
            >
              {messages.length === 0 && (
                <div className="relative h-full min-h-0 flex flex-col items-center justify-start sm:justify-center px-1 sm:px-5 pt-3 pb-4 sm:py-8">
                  <div
                    className="pointer-events-none absolute inset-0"
                    aria-hidden
                    style={{
                      background:
                        "radial-gradient(ellipse 50% 35% at 50% 18%, rgba(197,163,104,0.08), transparent 65%)",
                    }}
                  />
                  <div className="relative w-full max-w-[28rem] sm:max-w-[30rem] flex flex-col items-center">
                    <div className="mb-3 sm:mb-5 w-9 h-9 sm:w-12 sm:h-12 rounded-full border border-[#c5a368]/55 bg-[#c5a368]/10 flex items-center justify-center shadow-[0_0_28px_rgba(197,163,104,0.18)]">
                      <span className="relative inline-flex text-[#c5a368]">
                        <Sparkles size={14} strokeWidth={2} className="sm:hidden" />
                        <Sparkles size={16} strokeWidth={2} className="hidden sm:block" />
                        <Sparkles
                          size={9}
                          strokeWidth={2}
                          className="absolute -right-1 -top-0.5 sm:-right-1.5 sm:-top-1 opacity-80"
                        />
                      </span>
                    </div>

                    <h2 className="font-serif text-[1.25rem] sm:text-[1.85rem] text-white text-center tracking-tight leading-[1.2] text-balance px-1">
                      {copy.emptyTitle}
                    </h2>
                    <p className="mt-1.5 sm:mt-2.5 text-[12px] sm:text-[14px] text-white/45 text-center leading-relaxed max-w-[22rem] px-1">
                      {copy.empty}
                    </p>

                    <div className="mt-3 sm:mt-6 w-full rounded-xl sm:rounded-2xl border border-white/10 bg-[#1a1c1f] px-3 sm:px-4 py-2.5 sm:py-3.5 text-[12px] sm:text-[14px] text-white/80 text-center leading-snug shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      {copy.inviteBubble}
                    </div>

                    <div className="w-full flex items-center gap-2 sm:gap-3 my-3 sm:my-5">
                      <span className="h-px flex-1 bg-[#c5a368]/45" />
                      <span className="text-[10px] sm:text-[11px] text-white/40 whitespace-nowrap">
                        {copy.orStart}
                      </span>
                      <span className="h-px flex-1 bg-[#c5a368]/45" />
                    </div>

                    <div className="w-full flex flex-col gap-1.5 sm:gap-2.5">
                      {copy.starters.map((starter, i) => {
                        const Icon = STARTER_ICONS[i] || Home;
                        return (
                          <button
                            key={starter}
                            type="button"
                            disabled={sending}
                            onClick={() => void sendMessage(starter)}
                            className="group grid w-full cursor-pointer grid-cols-[2.25rem_1px_minmax(0,1fr)_2rem] sm:grid-cols-[2.75rem_1px_minmax(0,1fr)_2.5rem] items-center min-h-[2.75rem] sm:min-h-[3.25rem] rounded-full border border-white/12 bg-transparent hover:border-[#c5a368]/65 hover:bg-white/[0.03] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:border-[#c5a368] focus-visible:ring-1 focus-visible:ring-[#c5a368]/35"
                          >
                            <span className="flex h-full items-center justify-center text-[#c5a368]">
                              <Icon
                                className="block h-4 w-4 sm:h-[18px] sm:w-[18px] shrink-0"
                                strokeWidth={1.75}
                                aria-hidden
                              />
                            </span>
                            <span
                              className="h-4 sm:h-5 w-px justify-self-center bg-white/18"
                              aria-hidden
                            />
                            <span className="min-w-0 py-2.5 sm:py-3.5 pl-2.5 sm:pl-3.5 pr-1.5 sm:pr-2 text-left text-[12px] sm:text-[14px] leading-[1.3] text-white/90">
                              {starter}
                            </span>
                            <span className="flex h-full items-center justify-center text-[#c5a368] transition-transform duration-200 group-hover:translate-x-0.5">
                              <ArrowRight
                                className="block h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0"
                                strokeWidth={1.75}
                                aria-hidden
                              />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${
                    m.role === "user"
                      ? "justify-end items-end"
                      : "justify-start items-end"
                  }`}
                >
                  {m.role === "assistant" && (
                    <GoldStar className="w-7 h-7 mb-0.5" />
                  )}
                  <div
                    className={`max-w-[min(92%,36rem)] px-3.5 sm:px-4 py-2.5 text-[14px] sm:text-[15px] leading-relaxed break-words ${
                      m.role === "user"
                        ? "rounded-2xl rounded-br-md bg-[linear-gradient(145deg,#e4cfa0,#c9a35e)] text-[#1a1510] whitespace-pre-wrap shadow-[0_8px_24px_rgba(201,163,94,0.2)]"
                        : "rounded-2xl rounded-bl-md bg-white/[0.06] border border-white/10 text-white/90"
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
                <ThinkingBubble locale={locale} amending={amending} />
              )}

              {error && (
                <p className="text-[12px] text-[#e8a87c] break-words">{error}</p>
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={onSubmit}
              className="border-t border-white/[0.07] p-2.5 sm:p-4 shrink-0 bg-[#0e1116]/80"
            >
              {sending ? (
                <p className="text-[10px] sm:text-[11px] text-[#d7a866]/90 text-center mb-1.5 sm:mb-2">
                  {copy.composingHint}
                </p>
              ) : messages.length === 0 ? (
                <p className="text-[10px] sm:text-[11px] text-white/40 text-center mb-1.5 sm:mb-2">
                  {copy.selectPrompt}
                </p>
              ) : null}
              <div className="flex items-end gap-2 max-w-3xl mx-auto">
                <div className="flex-1 min-w-0 flex items-end rounded-xl sm:rounded-2xl border border-white/12 bg-white/[0.04] focus-within:border-[#d7a866]/55 transition-colors">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void onSubmit(e as unknown as FormEvent);
                      }
                    }}
                    placeholder={copy.placeholder}
                    className="flex-1 min-w-0 resize-none bg-transparent px-3 sm:px-4 py-2.5 sm:py-3 text-[13px] sm:text-[14px] text-white outline-none placeholder:text-white/35 max-h-28 sm:max-h-32"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label={sending ? "Add" : "Send"}
                  className="cursor-pointer shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[linear-gradient(145deg,#e4cfa0,#c9a35e)] text-[#1a1510] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105 transition shadow-[0_8px_20px_rgba(201,163,94,0.25)]"
                >
                  <ArrowUp size={17} strokeWidth={2.5} />
                </button>
              </div>
              <p className="text-[9px] sm:text-[10px] text-white/35 text-center mt-1.5 sm:mt-2.5">
                {copy.disclaimer}
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
