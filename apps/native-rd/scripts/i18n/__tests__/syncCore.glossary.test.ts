/**
 * Focused smoke test for glossary wiring in `syncOneNamespace`.
 *
 * Kept separate from `sync.test.ts` and `syncCore.intents.test.ts` so the
 * glossary-wiring expectation is easy to find and matches the per-layer
 * test-file pattern established by intent wiring in #162.
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
  const root = mkdtempSync(join(tmpdir(), "synccore-glossary-"));
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

describe("syncOneNamespace — glossary wiring", () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = makeFixture();
    mockCallModel.mockReset();
  });

  afterEach(() => {
    fixture.cleanup();
  });

  test("passes glossary terms into the LLM system prompt when glossary.txt exists", async () => {
    writeFileSync(
      join(fixture.enDir, "welcome.json"),
      JSON.stringify({ hero: { title: "still here?" } }),
      "utf8",
    );
    writeFileSync(
      join(fixture.paths.registerDir, "welcome.yml"),
      STUB_REGISTER,
    );
    writeFileSync(
      join(fixture.paths.registerDir, "glossary.txt"),
      ["# Brand", "Rollercoaster.dev", "Sam", "Cal"].join("\n"),
      "utf8",
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
    expect(systemPrompt).toContain("## Glossary");
    expect(systemPrompt).toContain("Rollercoaster.dev");
    expect(systemPrompt).toContain("Sam");
    expect(systemPrompt).toContain("Cal");
  });

  test("omits the glossary section when glossary.txt is absent", async () => {
    writeFileSync(
      join(fixture.enDir, "welcome.json"),
      JSON.stringify({ hero: { title: "still here?" } }),
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
    expect(systemPrompt).not.toContain("## Glossary");
  });

  test("omits the glossary section when glossary.txt is present but only comments/blanks", async () => {
    writeFileSync(
      join(fixture.enDir, "welcome.json"),
      JSON.stringify({ hero: { title: "still here?" } }),
      "utf8",
    );
    writeFileSync(
      join(fixture.paths.registerDir, "welcome.yml"),
      STUB_REGISTER,
    );
    writeFileSync(
      join(fixture.paths.registerDir, "glossary.txt"),
      "# only a header\n\n  \n",
      "utf8",
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
    expect(systemPrompt).not.toContain("## Glossary");
  });
});
