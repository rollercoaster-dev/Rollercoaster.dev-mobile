/**
 * Pure system-prompt assembly for the i18n batch translator.
 *
 * `translator.ts` parses the per-namespace register YAML into a `RegisterData`
 * record and calls `buildSystemPrompt` to produce the `system` string that
 * goes into `callModel`. Three inputs:
 *   - register: required, the per-namespace voice register
 *   - intents:  optional, per-string overrides (sidecar loader in #162)
 *   - glossary: optional, thin reference for canonical wordings
 *
 * `VOICE_PREAMBLE` carries the brand-wide voice instructions sourced from
 * `landing/docs/BRAND_LANGUAGE.md`. Register `banned_phrasings` are deduped
 * against `PREAMBLE_BANNED_ALL` (dismissive exits + ND deficit-framing vocab
 * + toxic-positive phrases) at assembly time so the same phrase never
 * appears twice in the assembled prompt.
 *
 * Pure: no I/O, no `import.meta`, no clock/random — same inputs in, same
 * string out.
 */

export type RegisterData = {
  speaker: string;
  audience: string;
  formality: string;
  banned_phrasings: string[];
  notes?: string[];
};

export type IntentEntry = {
  intent: string;
  audience?: string;
  register?: string;
};

export type PromptBuilderInput = {
  register: RegisterData;
  intents?: Record<string, IntentEntry>;
  glossary?: string;
};

// Single source of truth for banned dismissive exits. The list is rendered
// into the preamble below AND used to dedup register `banned_phrasings` at
// assembly time — keeping these in one constant avoids the two layers
// drifting out of sync.
export const PREAMBLE_BANNED_EXITS: readonly string[] = [
  "oder nicht",
  "oder lass es",
  "oder mach's halt nicht",
  "schließ den Tab",
  "wir sind hier wenn du zurückkommst",
];

// ND deficit-framing phrases named inline in the preamble below. Not
// rendered from this constant — the preamble lists them in prose. Used
// only as dedup input so register YAMLs that repeat these don't surface
// the same phrase twice in the assembled prompt.
export const PREAMBLE_BANNED_ND_VOCAB: readonly string[] = [
  "leidet an",
  "anders begabt",
  "besondere Bedürfnisse",
];

// Patronising / toxic-positive phrases named inline in the preamble below.
// Same contract as PREAMBLE_BANNED_ND_VOCAB — dedup-only, not rendered
// from this constant.
export const PREAMBLE_BANNED_TOXIC_POSITIVE: readonly string[] = [
  "besonders",
  "einzigartig",
  "Du schaffst das!",
  "Großartig!",
];

// Compare deduplication on a normalized form so 15 hand-authored YAML
// register files can't slip past the filter with trailing whitespace or
// stray capitalization (e.g. "  Oder Nicht  " vs "oder nicht"). The
// preamble's canonical form is what ships — we only normalize for the
// membership test.
function normalizeBan(phrase: string): string {
  return phrase.trim().toLowerCase();
}

const PREAMBLE_BANNED_ALL: ReadonlySet<string> = new Set(
  [
    ...PREAMBLE_BANNED_EXITS,
    ...PREAMBLE_BANNED_ND_VOCAB,
    ...PREAMBLE_BANNED_TOXIC_POSITIVE,
  ].map(normalizeBan),
);

const PREAMBLE_BANNED_EXITS_INLINE = PREAMBLE_BANNED_EXITS.map(
  (p) => `"${p}"`,
).join(", ");

const VOICE_PREAMBLE = `Task: translate each input value from English to German, applying the voice rules below. Keys are opaque identifiers — return them verbatim, do NOT interpret meaning from them.

This is the rollercoaster.dev brand voice. The audience is neurodivergent adults (ADHD, autism, bipolar). The product is a personal goal tracker built by one person (Joe, bipolar + ADHD). Voice comes from inside the audience — not from outside it.

Identity-first ND vocabulary in German:
- "autistisch", "ADHS", "bipolar" — identity-first, not deficit-first.
- Never "leidet an" (suffers from), "Störung" emphasis, "anders begabt", or "besondere Bedürfnisse". Treat ND as difference, not deficit.

Stance:
- Direct. One idea per sentence. Short sentences (~12 words avg). Concrete verbs, not abstract ones.
- Refusal-as-feature is preserved: "Keine Streaks. Keine Werbung." reads as confident, not apologetic — keep the bare-list shape.
- Limits-first: when the source admits a limit, the German must admit the same limit. Do not soften.
- Never corporate. Never patronising ("besonders", "einzigartig"). Never toxic-positive ("Du schaffst das!", "Großartig!").

Parenthetical asides (recognition pattern):
- Preserve them. \`(still here? good.)\` → \`(noch da? gut.)\`. Same shape, same warmth, never expanded into a sentence.
- Recognition asides only. NEVER dismissive / exit-asides.

Banned dismissive exits in German (never emit these, even if the source seems to invite them):
- ${PREAMBLE_BANNED_EXITS_INLINE} — these waved-off patterns contradict the founder energy of this project.

Punctuation:
- No default exclamation points. Reserve for genuine celebration moments only.
- No emoji unless the source already has one.

Placeholders:
- Preserve every \`{{placeholder}}\` token EXACTLY. Same name, same braces, same count. Do not translate placeholder names.

Output contract:
- Input is a flat JSON dictionary with anonymized string keys (e.g. \`k0\`, \`k1\`) mapping to English source values. The keys carry no semantic meaning — they are NOT paths or labels; do not translate, expand, or annotate them.
- Output is raw JSON with the IDENTICAL key set — no added keys, no dropped keys, no wrapper object. Only the values change (English → German).
- No markdown code fences. No prose before or after. JSON only.`;

function formatList(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function dedupedRegisterBans(bans: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const phrase of bans) {
    const norm = normalizeBan(phrase);
    if (PREAMBLE_BANNED_ALL.has(norm) || seen.has(norm)) continue;
    seen.add(norm);
    out.push(phrase);
  }
  return out;
}

function formatRegister(register: RegisterData): string {
  const lines = [
    "## Voice register",
    `Speaker: ${register.speaker}`,
    `Audience: ${register.audience}`,
    `Formality: ${register.formality}`,
  ];

  const bans = dedupedRegisterBans(register.banned_phrasings);
  if (bans.length > 0) {
    lines.push("Banned phrasings:", formatList(bans));
  } else {
    lines.push("Banned phrasings: (none beyond preamble defaults)");
  }

  if (register.notes && register.notes.length > 0) {
    lines.push("Notes:", formatList(register.notes));
  }

  return lines.join("\n");
}

function formatIntents(intents: Record<string, IntentEntry>): string {
  const entries = Object.entries(intents).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  if (entries.length === 0) {
    return "";
  }

  const lines = ["## Per-string intents"];
  for (const [key, entry] of entries) {
    const parts = [`intent="${entry.intent}"`];
    if (entry.audience) {
      parts.push(`audience="${entry.audience}"`);
    }
    if (entry.register) {
      parts.push(`register="${entry.register}"`);
    }
    lines.push(`- ${key}: ${parts.join(", ")}`);
  }
  return lines.join("\n");
}

function formatGlossary(glossary: string): string {
  return ["## Glossary", glossary.trim()].join("\n");
}

/**
 * Assemble the system prompt from register + optional intents + optional
 * glossary. Returns a plain-text block suitable for `callModel`'s `system`
 * argument. The system/user split is `callModel`'s concern — this function
 * returns only the system content.
 */
export function buildSystemPrompt(input: PromptBuilderInput): string {
  const sections: string[] = [VOICE_PREAMBLE, formatRegister(input.register)];

  if (input.intents && Object.keys(input.intents).length > 0) {
    sections.push(formatIntents(input.intents));
  }

  if (input.glossary && input.glossary.trim().length > 0) {
    sections.push(formatGlossary(input.glossary));
  }

  return sections.join("\n\n");
}
