import {
  buildSystemPrompt,
  type IntentEntry,
  type RegisterData,
} from "../promptBuilder";

const BASE_REGISTER: RegisterData = {
  speaker: "app",
  audience: "neurodivergent-adults",
  formality: "informal",
  banned_phrasings: [],
};

describe("buildSystemPrompt", () => {
  test("returns a non-empty string with register fields when only register is provided", () => {
    const out = buildSystemPrompt({ register: BASE_REGISTER });
    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(0);
    expect(out).toContain("Voice register");
    expect(out).toContain("app");
    expect(out).toContain("neurodivergent-adults");
    expect(out).toContain("informal");
  });

  test("includes banned phrasings as a bulleted list when present", () => {
    const out = buildSystemPrompt({
      register: {
        ...BASE_REGISTER,
        banned_phrasings: ["just", "simply"],
      },
    });
    expect(out).toContain("- just");
    expect(out).toContain("- simply");
  });

  test("includes notes section only when notes is non-empty", () => {
    const withNotes = buildSystemPrompt({
      register: { ...BASE_REGISTER, notes: ["prefer du over Sie"] },
    });
    expect(withNotes).toContain("Notes:");
    expect(withNotes).toContain("prefer du over Sie");

    const emptyNotes = buildSystemPrompt({
      register: { ...BASE_REGISTER, notes: [] },
    });
    expect(emptyNotes).not.toContain("Notes:");

    const noNotes = buildSystemPrompt({ register: BASE_REGISTER });
    expect(noNotes).not.toContain("Notes:");
  });

  test("omits intents section when intents is undefined", () => {
    const out = buildSystemPrompt({ register: BASE_REGISTER });
    expect(out).not.toContain("Per-string intents");
  });

  test("omits intents section when intents is an empty record", () => {
    const out = buildSystemPrompt({ register: BASE_REGISTER, intents: {} });
    expect(out).not.toContain("Per-string intents");
  });

  test("includes intents section when intents is provided and non-empty", () => {
    const intents: Record<string, IntentEntry> = {
      greeting: { intent: "warm welcome", audience: "first-run" },
      cta_save: { intent: "confirm save", register: "neutral" },
    };
    const out = buildSystemPrompt({ register: BASE_REGISTER, intents });
    expect(out).toContain("Per-string intents");
    expect(out).toContain("greeting");
    expect(out).toContain("warm welcome");
    expect(out).toContain('audience="first-run"');
    expect(out).toContain("cta_save");
    expect(out).toContain('register="neutral"');
  });

  test("omits glossary section when glossary is undefined or empty", () => {
    expect(buildSystemPrompt({ register: BASE_REGISTER })).not.toContain(
      "Glossary",
    );
    expect(
      buildSystemPrompt({ register: BASE_REGISTER, glossary: "" }),
    ).not.toContain("Glossary");
    expect(
      buildSystemPrompt({ register: BASE_REGISTER, glossary: "   " }),
    ).not.toContain("Glossary");
  });

  test("includes glossary section when glossary is provided", () => {
    const out = buildSystemPrompt({
      register: BASE_REGISTER,
      glossary: "Rollercoaster.dev → Rollercoaster.dev (do not translate)",
    });
    expect(out).toContain("Glossary");
    expect(out).toContain("Rollercoaster.dev");
  });

  test("combines all sections when all inputs are provided", () => {
    const out = buildSystemPrompt({
      register: { ...BASE_REGISTER, notes: ["identity-first vocab"] },
      intents: { greeting: { intent: "warm welcome" } },
      glossary: "brand: Rollercoaster.dev",
    });
    expect(out).toContain("Voice register");
    expect(out).toContain("Per-string intents");
    expect(out).toContain("Glossary");
    expect(out).toContain("Notes:");
  });

  test("is deterministic — same input produces identical output", () => {
    const input = {
      register: { ...BASE_REGISTER, notes: ["a", "b"] },
      intents: { k: { intent: "x" } },
      glossary: "g",
    };
    expect(buildSystemPrompt(input)).toBe(buildSystemPrompt(input));
  });

  test("preamble contains identity-first ND vocab instruction", () => {
    const out = buildSystemPrompt({ register: BASE_REGISTER });
    expect(out).toContain("autistisch");
    expect(out).toContain("ADHS");
    expect(out).toContain("identity-first");
  });

  test("preamble contains the placeholder-preservation contract", () => {
    const out = buildSystemPrompt({ register: BASE_REGISTER });
    expect(out).toMatch(/\{\{placeholder\}\}/);
    expect(out).toContain("EXACTLY");
  });

  test("preamble names the banned dismissive exits", () => {
    const out = buildSystemPrompt({ register: BASE_REGISTER });
    expect(out).toContain("oder nicht");
    expect(out).toContain("oder lass es");
  });

  test("register banned_phrasings are deduped against preamble exits", () => {
    const out = buildSystemPrompt({
      register: {
        ...BASE_REGISTER,
        banned_phrasings: [
          "oder nicht",
          "exclamation filler",
          "oder lass es",
          "exclamation filler",
        ],
      },
    });
    expect(out.match(/oder nicht/g)?.length).toBe(1);
    expect(out.match(/oder lass es/g)?.length).toBe(1);
    expect(out.match(/- exclamation filler/g)?.length).toBe(1);
  });

  test("dedup is case- and whitespace-insensitive against preamble exits", () => {
    const out = buildSystemPrompt({
      register: {
        ...BASE_REGISTER,
        banned_phrasings: [
          "  Oder Nicht  ",
          "ODER LASS ES",
          "exclamation filler",
        ],
      },
    });
    // Preamble dups appear once each in the preamble; no register-bullet copy.
    expect(out.match(/oder nicht/gi)?.length).toBe(1);
    expect(out.match(/oder lass es/gi)?.length).toBe(1);
    // Non-preamble phrase still surfaces in the register bullet list.
    expect(out).toContain("- exclamation filler");
  });

  test("dedup is case- and whitespace-insensitive across register entries", () => {
    const out = buildSystemPrompt({
      register: {
        ...BASE_REGISTER,
        banned_phrasings: [
          "exclamation filler",
          "Exclamation Filler",
          "  exclamation filler  ",
        ],
      },
    });
    // The first author-written form is preserved; the dup variants are dropped.
    expect(out.match(/- exclamation filler/g)?.length).toBe(1);
    expect(out).not.toContain("- Exclamation Filler");
  });

  test("register section falls back to '(none beyond preamble defaults)' when only preamble dups are listed", () => {
    const out = buildSystemPrompt({
      register: {
        ...BASE_REGISTER,
        banned_phrasings: ["oder nicht", "oder lass es"],
      },
    });
    expect(out).toContain("(none beyond preamble defaults)");
  });

  test("intent ordering is independent of object insertion order", () => {
    const a = buildSystemPrompt({
      register: BASE_REGISTER,
      intents: {
        zeta: { intent: "z" },
        alpha: { intent: "a" },
        mu: { intent: "m" },
      },
    });
    const b = buildSystemPrompt({
      register: BASE_REGISTER,
      intents: {
        alpha: { intent: "a" },
        mu: { intent: "m" },
        zeta: { intent: "z" },
      },
    });
    expect(a).toBe(b);
  });
});
