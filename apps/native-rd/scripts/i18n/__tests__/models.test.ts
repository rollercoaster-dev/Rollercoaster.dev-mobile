import { MODELS, getModel, type ModelEntry } from "../models";

import { generateText } from "ai";
import { callModel } from "../llmGateway";

describe("MODELS registry", () => {
  const expectedKeys = [
    "gpt-4o-mini",
    "gpt-4o",
    "gpt-5-mini",
    "claude-haiku-4-5",
    "claude-sonnet-4-6",
    "gemini-2.5-flash",
    "deepseek-chat",
    "gpt-oss-120b",
  ];

  test("contains all 8 expected entry names", () => {
    expect(Object.keys(MODELS).sort()).toEqual([...expectedKeys].sort());
  });

  type EntryCase = {
    name: string;
    modelId: string;
  };

  const entryCases: EntryCase[] = [
    { name: "gpt-4o-mini", modelId: "openai/gpt-4o-mini" },
    { name: "gpt-4o", modelId: "openai/gpt-4o" },
    { name: "gpt-5-mini", modelId: "openai/gpt-5-mini" },
    { name: "claude-haiku-4-5", modelId: "anthropic/claude-haiku-4-5" },
    { name: "claude-sonnet-4-6", modelId: "anthropic/claude-sonnet-4-6" },
    { name: "gemini-2.5-flash", modelId: "google/gemini-2.5-flash" },
    { name: "deepseek-chat", modelId: "deepseek/deepseek-chat" },
    { name: "gpt-oss-120b", modelId: "openai/gpt-oss-120b" },
  ];

  test.each(entryCases)(
    "$name maps to $modelId with temperature 0.0",
    ({ name, modelId }) => {
      const entry = MODELS[name];
      expect(entry).toBeDefined();
      expect((entry as ModelEntry).modelId).toBe(modelId);
      expect((entry as ModelEntry).temperature).toBe(0.0);
    },
  );
});

describe("getModel", () => {
  test("returns the entry for a known name", () => {
    expect(getModel("gpt-4o-mini").modelId).toBe("openai/gpt-4o-mini");
  });

  test("throws on an unknown name", () => {
    expect(() => getModel("not-a-real-model")).toThrow(/not-a-real-model/);
  });

  test("error message lists at least one valid key", () => {
    let caught: unknown;
    try {
      getModel("not-a-real-model");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toMatch(/gpt-4o-mini/);
  });
});

jest.mock("ai", () => ({
  generateText: jest.fn(),
}));

jest.mock("@ai-sdk/openai", () => ({
  createOpenAI: jest.fn((_opts: unknown) => (modelId: string) => ({
    __modelId: modelId,
  })),
}));

const mockGenerateText = generateText as jest.MockedFunction<
  typeof generateText
>;

describe("callModel — fail-fast", () => {
  const originalKey = process.env.OPENROUTER_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = originalKey;
    }
    mockGenerateText.mockReset();
  });

  test("throws when OPENROUTER_API_KEY is unset, before any network call", async () => {
    delete process.env.OPENROUTER_API_KEY;
    await expect(callModel("gpt-4o-mini", "sys", "user")).rejects.toThrow(
      /OPENROUTER_API_KEY/,
    );
    expect(mockGenerateText).not.toHaveBeenCalled();
  });
});

describe("callModel — error propagation + arg shape", () => {
  const originalKey = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = originalKey;
    }
    mockGenerateText.mockReset();
  });

  test("propagates upstream API errors verbatim (no wrapping)", async () => {
    const upstream = new Error("upstream: 429 rate limited");
    mockGenerateText.mockRejectedValueOnce(upstream);

    let caught: unknown;
    try {
      await callModel("gpt-4o-mini", "sys", "user");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBe(upstream);
  });

  test("passes system + user as separate generateText params", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "Hallo",
      finishReason: "stop",
    } as Awaited<ReturnType<typeof generateText>>);

    const result = await callModel(
      "gpt-4o-mini",
      "you are a translator",
      "hello",
    );

    expect(result).toBe("Hallo");
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    const args = mockGenerateText.mock.calls[0][0] as {
      system: string;
      prompt: string;
      temperature: number;
    };
    expect(args.system).toBe("you are a translator");
    expect(args.prompt).toBe("hello");
    expect(args.temperature).toBe(0.0);
  });

  test.each([
    { name: "gpt-4o-mini", modelId: "openai/gpt-4o-mini" },
    { name: "claude-haiku-4-5", modelId: "anthropic/claude-haiku-4-5" },
    { name: "gemini-2.5-flash", modelId: "google/gemini-2.5-flash" },
  ])(
    "$name resolves to modelId $modelId on the generateText call",
    async ({ name, modelId }) => {
      mockGenerateText.mockResolvedValueOnce({
        text: "ok",
        finishReason: "stop",
      } as Awaited<ReturnType<typeof generateText>>);

      await callModel(name, "sys", "user");
      const args = mockGenerateText.mock.calls[0][0] as unknown as {
        model: { __modelId: string };
      };
      expect(args.model.__modelId).toBe(modelId);
    },
  );

  test("forwards entry.maxTokens as maxOutputTokens (locks SDK param name)", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "ok",
      finishReason: "stop",
    } as Awaited<ReturnType<typeof generateText>>);

    await callModel("gpt-4o-mini", "sys", "user");
    const args = mockGenerateText.mock.calls[0][0] as {
      maxOutputTokens: number | undefined;
    };
    // No registry entry currently sets maxTokens; locking the SDK key name
    // (renamed from `maxTokens` in AI SDK v6) and the passthrough wiring.
    expect(args).toHaveProperty("maxOutputTokens");
    expect(args.maxOutputTokens).toBeUndefined();
  });
});

describe("callModel — finishReason guard", () => {
  const originalKey = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = originalKey;
    }
    mockGenerateText.mockReset();
  });

  test.each([
    { finishReason: "length" },
    { finishReason: "content-filter" },
    { finishReason: "tool-calls" },
    { finishReason: "error" },
  ])(
    "throws when finishReason is $finishReason (non-stop)",
    async ({ finishReason }) => {
      mockGenerateText.mockResolvedValueOnce({
        text: "partial",
        finishReason,
      } as Awaited<ReturnType<typeof generateText>>);

      await expect(callModel("gpt-4o-mini", "sys", "user")).rejects.toThrow(
        new RegExp(`non-stop finishReason="${finishReason}"`),
      );
    },
  );

  test("does not throw when finishReason is stop", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "complete",
      finishReason: "stop",
    } as Awaited<ReturnType<typeof generateText>>);

    await expect(callModel("gpt-4o-mini", "sys", "user")).resolves.toBe(
      "complete",
    );
  });
});
