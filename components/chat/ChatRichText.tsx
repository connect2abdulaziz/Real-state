/**
 * Lightweight GPT-style formatting for chat replies:
 * bold, dividers, short lists — no full Markdown / no raw HTML.
 */
import type { ReactNode } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // **bold** segments
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(text.slice(last, m.index));
    }
    nodes.push(
      <strong key={`${keyPrefix}-b${i++}`} className="font-semibold text-foreground">
        {m[1]}
      </strong>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function ChatRichText({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let buf: string[] = [];
  let bi = 0;

  const flushPara = () => {
    if (!buf.length) return;
    const para = buf.join(" ").trim();
    buf = [];
    if (!para) return;
    blocks.push(
      <p key={`p${bi++}`} className="mb-2.5 last:mb-0">
        {renderInline(para, `p${bi}`)}
      </p>
    );
  };

  for (let li = 0; li < lines.length; li++) {
    const raw = lines[li];
    const trimmed = raw.trim();

    // Horizontal divider (--- or ***)
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushPara();
      blocks.push(
        <hr
          key={`hr${bi++}`}
          className="my-3 border-0 border-t border-white/15"
        />
      );
      continue;
    }

    // Blank line → paragraph break
    if (!trimmed) {
      flushPara();
      continue;
    }

    // Bullet line
    if (/^[-•*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      flushPara();
      const item = trimmed.replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, "");
      blocks.push(
        <div key={`li${bi++}`} className="flex gap-2 mb-1.5 last:mb-0">
          <span className="text-electric shrink-0 select-none">•</span>
          <span className="min-w-0">{renderInline(item, `li${bi}`)}</span>
        </div>
      );
      continue;
    }

    buf.push(trimmed);
  }
  flushPara();

  if (!blocks.length) {
    return (
      <span className="whitespace-pre-wrap break-words">
        {renderInline(text, "t")}
      </span>
    );
  }

  return <div className="break-words [overflow-wrap:anywhere]">{blocks}</div>;
}
