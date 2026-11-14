/**
 * Soft-clean model replies for the chat UI: strip common Markdown
 * so users see plain, friendly text.
 */
export function sanitizeChatReply(text: string): string {
  let t = text.replace(/\r\n/g, "\n").trim();
  if (!t) return t;

  // Remove fenced code blocks but keep inner text
  t = t.replace(/```[\w]*\n?([\s\S]*?)```/g, "$1");

  // Headings → plain lines
  t = t.replace(/^#{1,6}\s+/gm, "");

  // Bold / italic markers
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");
  t = t.replace(/__([^_]+)__/g, "$1");
  t = t.replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, "$1");
  t = t.replace(/(?<!\w)_([^_]+)_(?!\w)/g, "$1");

  // Markdown links [label](url) → label (url)
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1 ($2)");

  // Simple markdown tables → plain lines
  const lines = t.split("\n");
  const cleaned: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\|?[\s:-]+\|[\s|:-]*$/.test(trimmed)) continue; // separator row
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length >= 2) {
        cleaned.push(`${cells[0]}: ${cells.slice(1).join(" · ")}`);
      } else if (cells.length === 1) {
        cleaned.push(cells[0]);
      }
      continue;
    }
    // Convert leading markdown bullets to a plain dash-free sentence break
    cleaned.push(line.replace(/^\s*[-*+]\s+/, "• "));
  }
  t = cleaned.join("\n");

  // Drop awkward "no comps / PDF missing" boilerplate if the model slips
  t = t.replace(
    /^[\s\S]{0,40}?(?:no (?:Estate Valora )?comps[^\n]*|Estate Valora (?:comps|listings)[^\n]*(?:not|no|missing|unavailable|were not)[^\n]*)\n+/gim,
    ""
  );
  t = t.replace(
    /\n{0,2}#{0,3}\s*Estate Valora[^\n]*(?:if available|listings)[^\n]*\n+[\s\S]*?(?=\n#{1,3}\s|\n{2}##|\n*$)/gi,
    "\n"
  );
  t = t.replace(
    /\n[^\n]*(?:no matching|not present in|internal PDF|knowledge base|excerpts provided)[^\n]*/gi,
    ""
  );

  // Collapse excess blank lines
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  return t;
}
