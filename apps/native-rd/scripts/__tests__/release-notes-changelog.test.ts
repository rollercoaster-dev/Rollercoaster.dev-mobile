import {
  buildScaffold,
  extractVersionSection,
  isUserFacing,
  parseBullet,
  parseSection,
  todoList,
  type ChangelogSection,
} from "../release-notes-changelog";

describe("parseBullet", () => {
  test("extracts a conventional-commit scope and strips a trailing PR link", () => {
    const entry = parseBullet(
      "* **goals:** add next-step hint to home card ([#42](https://x/pull/42))",
    );
    expect(entry).toEqual({
      scope: "goals",
      title: "add next-step hint to home card",
    });
  });

  test("returns a null scope for an unscoped bullet", () => {
    expect(parseBullet("- plain change with no scope")).toEqual({
      scope: null,
      title: "plain change with no scope",
    });
  });

  test("peels release-please's ', closes [#NN](url)' suffix", () => {
    const entry = parseBullet(
      "* **ci:** unbreak format check, closes [#213](https://x/issues/213)",
    );
    expect(entry.title).toBe("unbreak format check");
  });

  test("peels multiple stacked link groups", () => {
    const entry = parseBullet(
      "* **native-rd:** localise date ([abc123](https://x/commit/abc123)) ([#210](https://x/pull/210))",
    );
    expect(entry.title).toBe("localise date");
  });
});

describe("extractVersionSection", () => {
  const changelog = [
    "# Changelog",
    "",
    "## [0.1.41] (2026-06-01)",
    "",
    "### Features",
    "",
    "* later feature",
    "",
    "## [0.1.4] (2026-05-20)",
    "",
    "### Bug Fixes",
    "",
    "* the target fix",
    "",
    "## 0.1.3 (2026-05-10)",
    "",
    "### Features",
    "",
    "* an older feature",
  ].join("\n");

  test("returns only the requested linked-form section", () => {
    const section = extractVersionSection(changelog, "0.1.4");
    expect(section).toContain("the target fix");
    expect(section).not.toContain("later feature");
    expect(section).not.toContain("an older feature");
  });

  test("does not match a longer version sharing the prefix (0.1.4 vs 0.1.41)", () => {
    // The \b guard means looking up 0.1.4 must skip the 0.1.41 heading.
    const section = extractVersionSection(changelog, "0.1.4");
    expect(section).not.toContain("later feature");
  });

  test("matches the unlinked '## X.Y.Z' heading form", () => {
    const section = extractVersionSection(changelog, "0.1.3");
    expect(section).toContain("an older feature");
  });

  test("throws when the version is absent", () => {
    expect(() => extractVersionSection(changelog, "9.9.9")).toThrow(
      /Could not find version 9\.9\.9/,
    );
  });
});

describe("parseSection", () => {
  test("buckets Features and Bug Fixes and ignores other headings", () => {
    const section = [
      "### Features",
      "* **goals:** add hint",
      "* add streaks",
      "",
      "### Bug Fixes",
      "* **ui:** fix crash",
      "",
      "### Miscellaneous Chores",
      "* bump deps",
    ].join("\n");
    const parsed = parseSection(section);
    expect(parsed.features).toHaveLength(2);
    expect(parsed.fixes).toHaveLength(1);
    expect(parsed.features.map((f) => f.title)).toEqual([
      "add hint",
      "add streaks",
    ]);
    // The chore bullet sits under a non-tracked heading → excluded entirely.
    expect(parsed.fixes[0].title).toBe("fix crash");
  });
});

describe("isUserFacing", () => {
  test("treats an unscoped entry as user-facing", () => {
    expect(isUserFacing({ scope: null, title: "x" })).toBe(true);
  });

  test.each(["ci", "chore", "build", "deps", "release"])(
    "hides internal scope %p",
    (scope) => {
      expect(isUserFacing({ scope, title: "x" })).toBe(false);
    },
  );

  test("matches internal scopes case-insensitively", () => {
    expect(isUserFacing({ scope: "CI", title: "x" })).toBe(false);
  });

  test("treats a product scope as user-facing", () => {
    expect(isUserFacing({ scope: "goals", title: "x" })).toBe(true);
  });
});

describe("todoList", () => {
  test("renders a (none) placeholder for an empty list", () => {
    expect(todoList([])).toBe("- TODO: (none in this release)");
  });

  test("prefixes each entry with 'TODO: '", () => {
    expect(todoList([{ scope: null, title: "do a thing" }])).toBe(
      "- TODO: do a thing",
    );
  });
});

describe("buildScaffold", () => {
  const section: ChangelogSection = {
    features: [
      { scope: "goals", title: "add hint" },
      { scope: "ci", title: "tweak pipeline" },
    ],
    fixes: [{ scope: null, title: "fix a crash" }],
  };

  test("embeds the version and injected date, and stays linter-failing", () => {
    const { content } = buildScaffold("0.1.5", section, "2026-05-29");
    expect(content).toContain("version: 0.1.5");
    expect(content).toContain("date: 2026-05-29");
    // The scaffold MUST contain TODO markers so release-notes:lint blocks it.
    expect(content).toContain("TODO:");
  });

  test("counts user-facing vs internal entries", () => {
    const scaffold = buildScaffold("0.1.5", section, "2026-05-29");
    expect(scaffold.userFacingFeatureCount).toBe(1);
    expect(scaffold.internalFeatureCount).toBe(1);
    expect(scaffold.userFacingFixCount).toBe(1);
    expect(scaffold.internalFixCount).toBe(0);
  });

  test("excludes internal-scope entries from the user-facing slices", () => {
    const { content } = buildScaffold("0.1.5", section, "2026-05-29");
    expect(content).toContain("add hint");
    expect(content).not.toContain("tweak pipeline");
  });
});
