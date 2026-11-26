/**
 * Soft-clean model replies for the chat UI.
 * Keeps GPT-style **bold**, --- dividers, and short bullets.
 * Still strips Sources / URLs / heavy markdown tables.
 */
export function sanitizeChatReply(text: string): string {
  let t = text.replace(/\r\n/g, "\n").trim();
  if (!t) return t;

  // Remove fenced code blocks but keep inner text
  t = t.replace(/```[\w]*\n?([\s\S]*?)```/g, "$1");

  // Headings → bold line (GPT-like emphasis without #)
  t = t.replace(/^#{1,6}\s+(.+)$/gm, "**$1**");

  // Keep **bold**; convert __bold__ → **bold**
  t = t.replace(/__([^_]+)__/g, "**$1**");
  // Drop single *italic* / _italic_ markers (noisy in chat)
  t = t.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1");
  t = t.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, "$1");

  // Markdown links [label](url) → label only
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1");

  // Strip trailing Sources / References blocks (EN + FR)
  t = t.replace(
    /\n+(?:#{1,6}\s*)?(?:sources?(?:\s+used)?|references?|références?|citations?)\s*:?\s*\n[\s\S]*$/i,
    ""
  );

  const lines = t.split("\n");
  const cleaned: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\|?[\s:-]+\|[\s|:-]*$/.test(trimmed)) continue;
    if (/^https?:\/\/\S+$/i.test(trimmed)) continue;
    if (
      /^(?:web|comp|source|réf(?:érence)?)\s*[·•:\-–]\s*.+/i.test(trimmed) &&
      /https?:\/\//i.test(trimmed)
    ) {
      continue;
    }
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length >= 2) {
        cleaned.push(`**${cells[0]}:** ${cells.slice(1).join(" · ")}`);
      } else if (cells.length === 1) {
        cleaned.push(cells[0]);
      }
      continue;
    }
    // Normalize markdown bullets to •
    cleaned.push(line.replace(/^\s*[-*+]\s+/, "• "));
  }
  t = cleaned.join("\n");

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

  t = t.replace(
    /\b(?:according to|per|via|from)\s+(?:Equipe AJ(?:\s*\/\s*Centris)?|OpenHouse(?:\s*QC)?|HousingPortal|HonestDoor|Centris|realtor\.ca|APCIQ|QAREB|JLR)(?:\s*\([^)]*\))?(?:,?\s*)?/gi,
    ""
  );
  t = t.replace(
    /\b(?:selon|d['’]après|via)\s+(?:Equipe AJ(?:\s*\/\s*Centris)?|OpenHouse(?:\s*QC)?|HousingPortal|HonestDoor|Centris|realtor\.ca|APCIQ|QAREB|JLR)(?:\s*\([^)]*\))?(?:,?\s*)?/gi,
    ""
  );

  t = t.replace(/\(?https?:\/\/[^\s)]+\)?/gi, "");
  t = t.replace(/[ \t]{2,}/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  return t;
}
