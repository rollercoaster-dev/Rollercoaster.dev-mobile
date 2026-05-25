import { callModel } from "../llmGateway";
import { translateNamespace } from "../translator";

jest.mock("../llmGateway", () => ({
  callModel: jest.fn(),
}));

const mockCallModel = callModel as jest.MockedFunction<typeof callModel>;

const STUB_REGISTER = `
speaker: app
audience: neurodivergent-adults
formality: informal
banned_phrasings: []
`.trim();

afterEach(() => {
  mockCallModel.mockReset();
});

describe("translateNamespace — happy path", () => {
  test("fills gaps when LLM returns valid response", async () => {
    const enTree = { greeting: "Hello", farewell: "Goodbye" };
    const deTree = {};
    mockCallModel.mockResolvedValueOnce(
      JSON.stringify({ k0: "Hallo", k1: "Auf Wiedersehen" }),
    );

    const result = await translateNamespace({
      enTree,
      deTree,
      ns: "common",
      modelName: "gpt-4o-mini",
      registerText: STUB_REGISTER,
    });

    expect(result).toEqual({ greeting: "Hallo", farewell: "Auf Wiedersehen" });
    expect(mockCallModel).toHaveBeenCalledTimes(1);
  });

  test("passes modelName, non-empty system prompt, and serialized dict to callModel", async () => {
    const enTree = { greeting: "Hello" };
    const deTree = {};
    mockCallModel.mockResolvedValueOnce(JSON.stringify({ k0: "Hallo" }));

    await translateNamespace({
      enTree,
      deTree,
      ns: "common",
      modelName: "claude-haiku-4-5",
      registerText: STUB_REGISTER,
    });

    const [name, systemPrompt, userContent] = mockCallModel.mock.calls[0];
    expect(name).toBe("claude-haiku-4-5");
    expect(typeof systemPrompt).toBe("string");
    expect(systemPrompt.length).toBeGreaterThan(0);
    expect(systemPrompt).toContain("Voice register");
    expect(JSON.parse(userContent)).toEqual({ k0: "Hello" });
  });
});

describe("translateNamespace — idempotency", () => {
  test("returns target unchanged and skips LLM when no gaps", async () => {
    const enTree = { greeting: "Hello", farewell: "Goodbye" };
    const deTree = { greeting: "Hallo", farewell: "Auf Wiedersehen" };

    const result = await translateNamespace({
      enTree,
      deTree,
      ns: "common",
      modelName: "gpt-4o-mini",
      registerText: STUB_REGISTER,
    });

    expect(result).toEqual(deTree);
    expect(mockCallModel).not.toHaveBeenCalled();
  });
});

describe("translateNamespace — placeholder mismatch aborts", () => {
  test("throws when LLM drops a placeholder, with key + mismatch details", async () => {
    const enTree = { welcome: "Hello {{name}}!" };
    const deTree = {};
    mockCallModel.mockResolvedValueOnce(JSON.stringify({ k0: "Hallo!" }));

    await expect(
      translateNamespace({
        enTree,
        deTree,
        ns: "common",
        modelName: "gpt-4o-mini",
        registerText: STUB_REGISTER,
      }),
    ).rejects.toThrow(/placeholder mismatch on key k0.*missing=\[name\]/);
  });

  test("throws when LLM renames a placeholder", async () => {
    const enTree = { welcome: "Hello {{name}}!" };
    const deTree = {};
    mockCallModel.mockResolvedValueOnce(
      JSON.stringify({ k0: "Hallo {{nom}}!" }),
    );

    await expect(
      translateNamespace({
        enTree,
        deTree,
        ns: "common",
        modelName: "gpt-4o-mini",
        registerText: STUB_REGISTER,
      }),
    ).rejects.toThrow(/placeholder mismatch.*missing=\[name\] extra=\[nom\]/);
  });
});

describe("translateNamespace — parse failure aborts", () => {
  test("throws on malformed JSON with namespace context", async () => {
    const enTree = { greeting: "Hello" };
    const deTree = {};
    mockCallModel.mockResolvedValueOnce("not json {");

    await expect(
      translateNamespace({
        enTree,
        deTree,
        ns: "common",
        modelName: "gpt-4o-mini",
        registerText: STUB_REGISTER,
      }),
    ).rejects.toThrow(/namespace common.*malformed-json/);
  });

  test("throws with missing-keys reason on wrong key set", async () => {
    const enTree = { greeting: "Hello", farewell: "Goodbye" };
    const deTree = {};
    mockCallModel.mockResolvedValueOnce(JSON.stringify({ k0: "Hallo" }));

    await expect(
      translateNamespace({
        enTree,
        deTree,
        ns: "common",
        modelName: "gpt-4o-mini",
        registerText: STUB_REGISTER,
      }),
    ).rejects.toThrow(/namespace common.*missing-keys.*k1/);
  });

  test("throws with extra-keys reason when LLM adds keys", async () => {
    const enTree = { greeting: "Hello" };
    const deTree = {};
    mockCallModel.mockResolvedValueOnce(
      JSON.stringify({ k0: "Hallo", k99: "stowaway" }),
    );

    await expect(
      translateNamespace({
        enTree,
        deTree,
        ns: "common",
        modelName: "gpt-4o-mini",
        registerText: STUB_REGISTER,
      }),
    ).rejects.toThrow(/namespace common.*extra-keys.*k99/);
  });

  test("throws with schema-mismatch reason on non-string values", async () => {
    const enTree = { greeting: "Hello" };
    const deTree = {};
    mockCallModel.mockResolvedValueOnce(JSON.stringify({ k0: 42 }));

    await expect(
      translateNamespace({
        enTree,
        deTree,
        ns: "common",
        modelName: "gpt-4o-mini",
        registerText: STUB_REGISTER,
      }),
    ).rejects.toThrow(/namespace common.*schema-mismatch/);
  });
});

describe("translateNamespace — register/intent/glossary plumbing", () => {
  test("works with register only (no intent sidecar)", async () => {
    const enTree = { greeting: "Hello" };
    const deTree = {};
    mockCallModel.mockResolvedValueOnce(JSON.stringify({ k0: "Hallo" }));

    const result = await translateNamespace({
      enTree,
      deTree,
      ns: "common",
      modelName: "gpt-4o-mini",
      registerText: STUB_REGISTER,
    });

    expect(result).toEqual({ greeting: "Hallo" });
    const [, systemPrompt] = mockCallModel.mock.calls[0];
    expect(systemPrompt).not.toContain("Per-string intents");
  });

  test("includes intent + glossary sections when provided", async () => {
    const enTree = { greeting: "Hello" };
    const deTree = {};
    mockCallModel.mockResolvedValueOnce(JSON.stringify({ k0: "Hallo" }));

    await translateNamespace({
      enTree,
      deTree,
      ns: "common",
      modelName: "gpt-4o-mini",
      registerText: STUB_REGISTER,
      intents: { greeting: { intent: "warm welcome" } },
      glossary: "brand: Rollercoaster.dev",
    });

    const [, systemPrompt] = mockCallModel.mock.calls[0];
    expect(systemPrompt).toContain("Per-string intents");
    expect(systemPrompt).toContain("Glossary");
  });

  test("throws on malformed register YAML with namespace context", async () => {
    const enTree = { greeting: "Hello" };
    const deTree = {};

    await expect(
      translateNamespace({
        enTree,
        deTree,
        ns: "common",
        modelName: "gpt-4o-mini",
        registerText: "speaker: app\n  bad indentation\n   :::",
      }),
    ).rejects.toThrow(/namespace common.*register YAML parse failed/);
    expect(mockCallModel).not.toHaveBeenCalled();
  });

  test("throws when register YAML is missing required fields", async () => {
    const enTree = { greeting: "Hello" };
    const deTree = {};

    await expect(
      translateNamespace({
        enTree,
        deTree,
        ns: "common",
        modelName: "gpt-4o-mini",
        registerText: "speaker: app\n",
      }),
    ).rejects.toThrow(
      /namespace common.*register YAML schema invalid.*audience/,
    );
    expect(mockCallModel).not.toHaveBeenCalled();
  });

  test("schema-invalid message surfaces wrong-type details, not generic 'missing'", async () => {
    const enTree = { greeting: "Hello" };
    const deTree = {};

    await expect(
      translateNamespace({
        enTree,
        deTree,
        ns: "common",
        modelName: "gpt-4o-mini",
        registerText:
          "speaker: app\naudience: nd-adults\nformality: 42\nbanned_phrasings: []\n",
      }),
    ).rejects.toThrow(/namespace common.*register YAML schema invalid/);
    expect(mockCallModel).not.toHaveBeenCalled();
  });

  test("preserves YAML parse error cause for debugging", async () => {
    const enTree = { greeting: "Hello" };
    const deTree = {};

    let caught: unknown;
    try {
      await translateNamespace({
        enTree,
        deTree,
        ns: "common",
        modelName: "gpt-4o-mini",
        registerText: "speaker: app\n  bad indentation\n   :::",
      });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).cause).toBeInstanceOf(Error);
  });
});
