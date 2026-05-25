/**
 * Focused smoke test for sidecar-intent wiring in `syncOneNamespace`.
 *
 * Kept separate from `sync.test.ts` so the intent-wiring expectation is easy
 * to find and won't be obscured by the broader sync test suite (decision U4
 * in the dev plan for #162).
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { callModel } from "../llmGateway";
import { syncOneNamespace, type SyncPaths } from "../syncCore";

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

type Fixture = {
  paths: SyncPaths;
  enDir: string;
  cleanup: () => void;
};

function makeFixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "synccore-intents-"));
  const enDir = join(root, "en");
  const targetDir = join(root, "de");
  const registerDir = join(root, "_register");
  mkdirSync(enDir);
  mkdirSync(targetDir);
  mkdirSync(registerDir);
  return {
    paths: { enDir, targetDir, registerDir },
    enDir,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

describe("syncOneNamespace — sidecar intent wiring", () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = makeFixture();
    mockCallModel.mockReset();
  });

  afterEach(() => {
    fixture.cleanup();
  });

  test("passes loaded intents into the LLM system prompt when sidecar exists", async () => {
    writeFileSync(
      join(fixture.enDir, "welcome.json"),
      JSON.stringify({ title: "still here?" }),
      "utf8",
    );
    writeFileSync(
      join(fixture.enDir, "welcome.intents.json"),
      JSON.stringify({
        title: {
          intent: "warm recognition, never expansive",
          audience: "first-run-nd-adult",
        },
      }),
      "utf8",
    );
    writeFileSync(
      join(fixture.paths.registerDir, "welcome.yml"),
      STUB_REGISTER,
    );

    mockCallModel.mockResolvedValueOnce(JSON.stringify({ k0: "noch da?" }));

    const outcome = await syncOneNamespace({
      ns: "welcome",
      paths: fixture.paths,
      modelName: "claude-haiku-4-5",
      dryRun: true,
    });

    if (outcome.kind === "failed") throw new Error(outcome.message);
    expect(outcome.kind).toBe("dry-run");
    expect(mockCallModel).toHaveBeenCalledTimes(1);
    const systemPrompt = mockCallModel.mock.calls[0]![1];
    expect(systemPrompt).toContain("Per-string intents");
    // After #180, intents are re-keyed onto synthetic dict keys (`k{n}`)
    // before reaching the prompt. The author-facing `title` source-path
    // key must NOT appear in the intents section.
    expect(systemPrompt).toContain("- k0:");
    expect(systemPrompt).not.toContain("- title:");
    expect(systemPrompt).toContain("warm recognition, never expansive");
    expect(systemPrompt).toContain('audience="first-run-nd-adult"');
  });

  test("omits the intents section when no sidecar file is present", async () => {
    writeFileSync(
      join(fixture.enDir, "welcome.json"),
      JSON.stringify({ title: "still here?" }),
      "utf8",
    );
    writeFileSync(
      join(fixture.paths.registerDir, "welcome.yml"),
      STUB_REGISTER,
    );

    mockCallModel.mockResolvedValueOnce(JSON.stringify({ k0: "noch da?" }));

    const outcome = await syncOneNamespace({
      ns: "welcome",
      paths: fixture.paths,
      modelName: "claude-haiku-4-5",
      dryRun: true,
    });

    expect(outcome.kind).toBe("dry-run");
    const systemPrompt = mockCallModel.mock.calls[0]![1];
    expect(systemPrompt).not.toContain("Per-string intents");
  });

  test("surfaces a corrupt sidecar as a failed outcome with the namespace name", async () => {
    writeFileSync(
      join(fixture.enDir, "welcome.json"),
      JSON.stringify({ title: "still here?" }),
      "utf8",
    );
    writeFileSync(
      join(fixture.enDir, "welcome.intents.json"),
      "{not valid json",
      "utf8",
    );
    writeFileSync(
      join(fixture.paths.registerDir, "welcome.yml"),
      STUB_REGISTER,
    );

    const outcome = await syncOneNamespace({
      ns: "welcome",
      paths: fixture.paths,
      modelName: "claude-haiku-4-5",
      dryRun: true,
    });

    expect(outcome.kind).toBe("failed");
    if (outcome.kind === "failed") {
      expect(outcome.message).toMatch(/welcome/);
      expect(outcome.message).toMatch(/not valid JSON/);
    }
    expect(mockCallModel).not.toHaveBeenCalled();
  });
});
