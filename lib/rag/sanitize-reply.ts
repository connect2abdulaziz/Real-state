/**
 * Soft-clean model replies for the chat UI.
 * Keeps GPT-style **bold**, --- dividers, and short bullets.
 * Aggressively strips site names, URLs, and "according to …" references
 * (client feedback: no visible sources in chat).
 */

const SITE_NAME =
  String.raw`Equipe\s*AJ(?:\s*\/\s*Centris)?|OpenHouse(?:\s*QC)?|HousingPortal|HonestDoor|Centris|realtor\.ca|APCIQ|QAREB|JLR|Duproprio|DuProprio|Zillow|Kijiji|Facebook\s*Marketplace|Google|Bing|Wikipedia|Statistique\s*Canada|Statistics\s*Canada|CMHC|SCHL|HouseSigma|Property\s*Assessment|Ville\s*de\s*Montr[eé]al|Donn[eé]es\s*Qu[eé]bec`;

const SITE_DOMAIN =
  String.raw`(?:https?:\/\/)?(?:www\.)?(?:equipeaj\.ca|openhouseqc\.com|housingportal\.ca|honestdoor\.com|centris\.ca|realtor\.ca|apciq\.ca|jlr\.ca|duproprio\.com|zillow\.com|kijiji\.ca|housesigma\.com|statcan\.gc\.ca|cmhc-schl\.gc\.ca)(?:\/[^\s)\]>]*)?`;

export function sanitizeChatReply(text: string): string {
  let t = text.replace(/\r\n/g, "\n").trim();
  if (!t) return t;

  // Remove fenced code blocks but keep inner text
  t = t.replace(/```[\w]*\n?([\s\S]*?)```/g, "$1");

  // Headings → bold line
  t = t.replace(/^#{1,6}\s+(.+)$/gm, "**$1**");

  // Keep **bold**; convert __bold__ → **bold**
  t = t.replace(/__([^_]+)__/g, "**$1**");
  t = t.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1");
  t = t.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, "$1");

  // Markdown links → label only
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1");

  // Drop any Sources / References section (anywhere, not only trailing)
  t = t.replace(
    /\n+(?:#{1,6}\s*)?\*{0,2}(?:sources?(?:\s+used)?|references?|références?|citations?|websites?|sites?(?:\s+consult[eé]s)?)\*{0,2}\s*:?\s*\n(?:[^\n]*\n?){0,20}/gi,
    "\n"
  );
  t = t.replace(
    /(?:^|\n)(?:#{1,6}\s*)?\*{0,2}(?:sources?(?:\s+used)?|references?|références?|citations?)\*{0,2}\s*:?\s*\n[\s\S]*$/i,
    ""
  );

  const lines = t.split("\n");
  const cleaned: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\|?[\s:-]+\|[\s|:-]*$/.test(trimmed)) continue;
    if (/^https?:\/\/\S+$/i.test(trimmed)) continue;
    // Drop lines that are mostly a source citation
    if (
      /^(?:source|réf(?:érence)?|reference|via|selon|d['’]après|from|per)\s*[:\-–]/i.test(
        trimmed
      )
    ) {
      continue;
    }
    if (
      /^(?:web|comp|source|réf(?:érence)?)\s*[·•:\-–]\s*.+/i.test(trimmed) &&
      (/https?:\/\//i.test(trimmed) || new RegExp(SITE_NAME, "i").test(trimmed))
    ) {
      continue;
    }
    // Drop bullet that is only a site name / URL
    if (
      /^[•*-]\s*(?:https?:\/\/\S+|(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/\S*)?)$/i.test(
        trimmed
      )
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

  // "see also realtor.ca", "more on HonestDoor"
  t = t.replace(
    new RegExp(
      String.raw`\b(?:see\s+also|more\s+(?:on|at)|check\s+(?:on|at)|visit|voir\s+aussi|consultez)\s+(?:${SITE_NAME}|${SITE_DOMAIN})(?:\s+for\s+[^.!\n]*)?[.!]?\s*`,
      "gi"
    ),
    ""
  );

  // "according to HonestDoor", "based on Centris data", "per realtor.ca", etc.
  t = t.replace(
    new RegExp(
      String.raw`\b(?:according\s+to|based\s+on|as\s+per|per|via|from|reported\s+by|data\s+from|figures?\s+from|sourced?\s+from)\s+(?:the\s+)?(?:${SITE_NAME})(?:\s*\([^)]*\))?(?:\s+(?:data|figures?|report|listings?|stats?|statistics?))?(?:,?\s*)?`,
      "gi"
    ),
    ""
  );
  t = t.replace(
    new RegExp(
      String.raw`\b(?:selon|d['’]après|via|d['’]après\s+les\s+données\s+de|d['’]après\s+les\s+chiffres\s+de|bas[eé]\s+sur|provenant\s+de)\s+(?:${SITE_NAME})(?:\s*\([^)]*\))?(?:\s+(?:données|chiffres|rapport|annonces?))?(?:,?\s*)?`,
      "gi"
    ),
    ""
  );

  // Parenthetical site mentions: (HonestDoor), (Centris, 2026)
  t = t.replace(new RegExp(String.raw`\s*\((?:${SITE_NAME})(?:[^)]*)\)`, "gi"), "");

  // Bare site brand left as citation fragment: "— HonestDoor." / ", Centris,"
  t = t.replace(
    new RegExp(
      String.raw`(?:^|[\s,;:—–-])(?:${SITE_NAME})(?=\s*[\.,;:!?]?(?:\s|$))`,
      "gi"
    ),
    " "
  );

  // Domains / URLs
  t = t.replace(new RegExp(SITE_DOMAIN, "gi"), "");
  t = t.replace(/\(?https?:\/\/[^\s)]+\)?/gi, "");
  t = t.replace(/\bwww\.[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s)\]>]*)?/gi, "");

  // Cleanup punctuation left by removals
  t = t.replace(/\(\s*\)/g, "");
  t = t.replace(/\s+([,.;:!?])/g, "$1");
  t = t.replace(/([,;]){2,}/g, "$1");
  t = t.replace(/[ \t]{2,}/g, " ");
  t = t.replace(/\n[ \t]+/g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  return t;
}
