/**
 * Pure system-prompt assembly for the i18n batch translator.
 *
 * `translator.ts` parses the per-namespace register YAML into a `RegisterData`
 * record and calls `buildSystemPrompt` to produce the `system` string that
 * goes into `callModel`. Three inputs:
 *   - register: required, the per-namespace voice register
 *   - intents:  optional, per-string overrides (sidecar from PR #8)
 *   - glossary: optional, thin reference for canonical wordings
 *
 * Skeleton template only (Resolved Decision #3 in dev-plan for #160). PR #8
 * owns the polished voice copy. Tests assert section presence, not wording.
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

function formatList(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function formatRegister(register: RegisterData): string {
  const lines = [
    "## Voice register",
    `Speaker: ${register.speaker}`,
    `Audience: ${register.audience}`,
    `Formality: ${register.formality}`,
  ];

  if (register.banned_phrasings.length > 0) {
    lines.push("Banned phrasings:", formatList(register.banned_phrasings));
  } else {
    lines.push("Banned phrasings: (none)");
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
  const sections: string[] = [
    "You translate UI strings from English to German. Preserve every `{{placeholder}}` token exactly. Return JSON with the same key set as the input. Output raw JSON only — do not wrap the response in markdown code fences (no ```json, no ```).",
    formatRegister(input.register),
  ];

  if (input.intents && Object.keys(input.intents).length > 0) {
    sections.push(formatIntents(input.intents));
  }

  if (input.glossary && input.glossary.trim().length > 0) {
    sections.push(formatGlossary(input.glossary));
  }

  return sections.join("\n\n");
}
