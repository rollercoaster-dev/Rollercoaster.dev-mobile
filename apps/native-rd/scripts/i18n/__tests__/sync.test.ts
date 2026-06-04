import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { callModel } from "../llmGateway";
import {
  SUPPORTED_TARGETS,
  discoverNamespaces,
  isSupportedTarget,
  parseArgs,
  resolveNamespaces,
  runSync,
  type SyncPaths,
} from "../syncCore";

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
  enPath: (ns: string) => string;
  targetPath: (ns: string) => string;
  cleanup: () => void;
};

function makeFixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "sync-test-"));
  const enDir = join(root, "en");
  const targetDir = join(root, "de");
  const registerDir = join(root, "_register");
  mkdirSync(enDir);
  mkdirSync(targetDir);
  mkdirSync(registerDir);
  return {
    paths: { enDir, targetDir, registerDir },
    enPath: (ns) => join(enDir, `${ns}.json`),
    targetPath: (ns) => join(targetDir, `${ns}.json`),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeRegister(fixture: Fixture, ns: string): void {
  writeFileSync(join(fixture.paths.registerDir, `${ns}.yml`), STUB_REGISTER);
}

let fixture: Fixture;

beforeEach(() => {
  fixture = makeFixture();
  mockCallModel.mockReset();
});

afterEach(() => {
  fixture.cleanup();
});

describe("parseArgs", () => {
  test("defaults: no flags → all-namespaces, target=de, model=claude-haiku-4-5", () => {
    const args = parseArgs([]);
    expect(args.namespace).toBeUndefined();
    expect(args.dryRun).toBe(false);
    expect(args.target).toBe("de");
    expect(args.modelName).toBe("claude-haiku-4-5");
  });

  test("parses every supported flag", () => {
    const args = parseArgs([
      "--namespace",
      "common",
      "--dry-run",
      "--target",
      "fr",
      "--model",
      "gpt-4o-mini",
    ]);
    expect(args.namespace).toBe("common");
    expect(args.dryRun).toBe(true);
    expect(args.target).toBe("fr");
    expect(args.modelName).toBe("gpt-4o-mini");
  });

  test("unknown flag throws — typo is a hard error, not a silent default", () => {
    expect(() => parseArgs(["--namspace", "common"])).toThrow(/unknown flag/);
  });

  test("--namespace without a value throws", () => {
    expect(() => parseArgs(["--namespace"])).toThrow(
      /--namespace requires a value/,
    );
  });

  test("flag followed by another flag throws — must not consume the next flag as a value", () => {
    // Without this guard, `--model --dry-run --namespace common` would bind
    // modelName="--dry-run" and leave dryRun=false, turning an intended
    // dry-run into a real write.
    expect(() =>
      parseArgs(["--model", "--dry-run", "--namespace", "common"]),
    ).toThrow(/--model requires a value/);
    expect(() => parseArgs(["--target", "--dry-run"])).toThrow(
      /--target requires a value/,
    );
    expect(() => parseArgs(["--namespace", "--dry-run"])).toThrow(
      /--namespace requires a value/,
    );
  });
});

describe("target validation", () => {
  test("only de is supported in v1", () => {
    expect(SUPPORTED_TARGETS).toEqual(["de"]);
    expect(isSupportedTarget("de")).toBe(true);
    expect(isSupportedTarget("fr")).toBe(false);
    expect(isSupportedTarget("")).toBe(false);
  });
});

describe("discoverNamespaces", () => {
  test("returns sorted bare names, excludes .intents.json sidecars", () => {
    writeJson(fixture.enPath("welcome"), {});
    writeJson(fixture.enPath("common"), {});
    // intents sidecar must not be discovered as a namespace
    writeFileSync(join(fixture.paths.enDir, "common.intents.json"), "{}");
    expect(discoverNamespaces(fixture.paths.enDir)).toEqual([
      "common",
      "welcome",
    ]);
  });
});

describe("resolveNamespaces", () => {
  test("returns all when requested is undefined", () => {
    expect(resolveNamespaces(["common", "welcome"], undefined)).toEqual([
      "common",
      "welcome",
    ]);
  });

  test("returns the singleton when requested is in available", () => {
    expect(resolveNamespaces(["common", "welcome"], "common")).toEqual([
      "common",
    ]);
  });

  test("throws on unknown namespace, listing available options", () => {
    expect(() => resolveNamespaces(["common", "welcome"], "nope")).toThrow(
      /unknown namespace: nope.*Available: common, welcome/,
    );
  });
});

describe("runSync — idempotency", () => {
  test("no-op when target already covers every source leaf", async () => {
    writeJson(fixture.enPath("alpha"), {
      greet: "Hello",
      farewell: "Goodbye {{name}}",
    });
    writeJson(fixture.targetPath("alpha"), {
      greet: "Hallo",
      farewell: "Auf Wiedersehen {{name}}",
    });
    writeRegister(fixture, "alpha");

    const summary = await runSync({
      paths: fixture.paths,
      namespaces: ["alpha"],
      modelName: "claude-haiku-4-5",
      dryRun: false,
    });

    expect(summary.hasFailures).toBe(false);
    expect(summary.outcomes[0]).toEqual({ kind: "no-gaps", ns: "alpha" });
    expect(mockCallModel).not.toHaveBeenCalled();

    // Target file untouched: byte-equal to what we wrote.
    expect(readFileSync(fixture.targetPath("alpha"), "utf8")).toBe(
      `${JSON.stringify({ greet: "Hallo", farewell: "Auf Wiedersehen {{name}}" }, null, 2)}\n`,
    );
  });
});

describe("runSync — idempotency short-circuits before register read", () => {
  test("no-gaps namespace succeeds even when its register file is absent", async () => {
    writeJson(fixture.enPath("alpha"), { greet: "Hello" });
    writeJson(fixture.targetPath("alpha"), { greet: "Hallo" });
    // intentionally NO writeRegister — if the gap check moved below
    // readRegisterText, this would fail with "register file not found".

    const summary = await runSync({
      paths: fixture.paths,
      namespaces: ["alpha"],
      modelName: "claude-haiku-4-5",
      dryRun: false,
    });

    expect(summary.hasFailures).toBe(false);
    expect(summary.outcomes[0]).toEqual({ kind: "no-gaps", ns: "alpha" });
    expect(mockCallModel).not.toHaveBeenCalled();
  });
});

describe("runSync — gap-only", () => {
  test("preserves existing target values verbatim, fills only missing keys", async () => {
    writeJson(fixture.enPath("alpha"), {
      greet: "Hello",
      farewell: "Goodbye {{name}}",
    });
    writeJson(fixture.targetPath("alpha"), { greet: "Hallo" });
    writeRegister(fixture, "alpha");

    mockCallModel.mockResolvedValueOnce(
      JSON.stringify({ k0: "Auf Wiedersehen {{name}}" }),
    );

    const summary = await runSync({
      paths: fixture.paths,
      namespaces: ["alpha"],
      modelName: "claude-haiku-4-5",
      dryRun: false,
    });

    expect(summary.hasFailures).toBe(false);
    expect(summary.outcomes[0].kind).toBe("wrote");

    const written = JSON.parse(
      readFileSync(fixture.targetPath("alpha"), "utf8"),
    );
    expect(written).toEqual({
      greet: "Hallo",
      farewell: "Auf Wiedersehen {{name}}",
    });
    expect(mockCallModel).toHaveBeenCalledTimes(1);
  });
});

describe("runSync — placeholder mismatch", () => {
  test("failure outcome, no write, exit-code-mapping sets hasFailures", async () => {
    writeJson(fixture.enPath("alpha"), { welcome: "Hello {{name}}!" });
    writeJson(fixture.targetPath("alpha"), {});
    writeRegister(fixture, "alpha");

    mockCallModel.mockResolvedValueOnce(JSON.stringify({ k0: "Hallo!" }));

    const summary = await runSync({
      paths: fixture.paths,
      namespaces: ["alpha"],
      modelName: "claude-haiku-4-5",
      dryRun: false,
    });

    expect(summary.hasFailures).toBe(true);
    const outcome = summary.outcomes[0];
    expect(outcome.kind).toBe("failed");
    if (outcome.kind !== "failed") throw new Error("unreachable");
    expect(outcome.message).toMatch(/placeholder mismatch.*missing=\[name\]/);

    // Target file must not have been written — it still contains the
    // pre-sync empty object we wrote ourselves.
    expect(
      JSON.parse(readFileSync(fixture.targetPath("alpha"), "utf8")),
    ).toEqual({});
  });
});

describe("runSync — key order", () => {
  test("written JSON preserves the en/ source key order", async () => {
    writeJson(fixture.enPath("beta"), { z: "Z", a: "A", m: "M" });
    writeJson(fixture.targetPath("beta"), {});
    writeRegister(fixture, "beta");

    mockCallModel.mockResolvedValueOnce(
      JSON.stringify({ k0: "Z_de", k1: "A_de", k2: "M_de" }),
    );

    await runSync({
      paths: fixture.paths,
      namespaces: ["beta"],
      modelName: "claude-haiku-4-5",
      dryRun: false,
    });

    const writtenText = readFileSync(fixture.targetPath("beta"), "utf8");
    // String-position assertions catch order regressions that an .toEqual
    // would miss (object equality ignores key order).
    const zIdx = writtenText.indexOf('"z"');
    const aIdx = writtenText.indexOf('"a"');
    const mIdx = writtenText.indexOf('"m"');
    expect(zIdx).toBeGreaterThan(-1);
    expect(zIdx).toBeLessThan(aIdx);
    expect(aIdx).toBeLessThan(mIdx);
  });
});

describe("runSync — dry-run", () => {
  test("calls the LLM but writes nothing; target file content unchanged", async () => {
    writeJson(fixture.enPath("alpha"), { greet: "Hello" });
    writeJson(fixture.targetPath("alpha"), {});
    writeRegister(fixture, "alpha");

    const beforeBytes = readFileSync(fixture.targetPath("alpha"), "utf8");
    mockCallModel.mockResolvedValueOnce(JSON.stringify({ k0: "Hallo" }));

    const summary = await runSync({
      paths: fixture.paths,
      namespaces: ["alpha"],
      modelName: "claude-haiku-4-5",
      dryRun: true,
    });

    expect(summary.hasFailures).toBe(false);
    expect(summary.outcomes[0]).toEqual({ kind: "dry-run", ns: "alpha" });
    expect(mockCallModel).toHaveBeenCalledTimes(1);
    expect(readFileSync(fixture.targetPath("alpha"), "utf8")).toBe(beforeBytes);
  });
});

describe("runSync — missing register hard-fails per namespace", () => {
  test("absent register produces a failed outcome naming the namespace", async () => {
    writeJson(fixture.enPath("alpha"), { greet: "Hello" });
    writeJson(fixture.targetPath("alpha"), {});
    // intentionally no writeRegister(fixture, "alpha")

    const summary = await runSync({
      paths: fixture.paths,
      namespaces: ["alpha"],
      modelName: "claude-haiku-4-5",
      dryRun: false,
    });

    expect(summary.hasFailures).toBe(true);
    const outcome = summary.outcomes[0];
    expect(outcome.kind).toBe("failed");
    if (outcome.kind !== "failed") throw new Error("unreachable");
    expect(outcome.message).toMatch(/register file not found.*alpha/);
    expect(mockCallModel).not.toHaveBeenCalled();
  });

  test("one namespace failing does not abort sibling namespaces", async () => {
    // alpha has no register → fails. beta has a register → succeeds.
    writeJson(fixture.enPath("alpha"), { greet: "Hello" });
    writeJson(fixture.targetPath("alpha"), {});
    writeJson(fixture.enPath("beta"), { save: "Save" });
    writeJson(fixture.targetPath("beta"), {});
    writeRegister(fixture, "beta");

    mockCallModel.mockResolvedValueOnce(JSON.stringify({ k0: "Speichern" }));

    const summary = await runSync({
      paths: fixture.paths,
      namespaces: ["alpha", "beta"],
      modelName: "claude-haiku-4-5",
      dryRun: false,
    });

    expect(summary.hasFailures).toBe(true);
    expect(summary.outcomes.map((o) => o.kind)).toEqual(["failed", "wrote"]);
    expect(existsSync(fixture.targetPath("beta"))).toBe(true);
    expect(
      JSON.parse(readFileSync(fixture.targetPath("beta"), "utf8")),
    ).toEqual({ save: "Speichern" });
  });
});
