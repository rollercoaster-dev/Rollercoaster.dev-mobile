import * as fs from "fs";
import * as path from "path";
import { COMPONENTS_DIR, getComponentDirs } from "./utils";

// Components known to lack test files — tracked debt, not masked failures.
// Remove entries as tests are added. See issue #155 for context.
const KNOWN_UNTESTED: Set<string> = new Set([]);

describe("Component structural requirements", () => {
  const components = getComponentDirs();

  test("components directory is not empty", () => {
    expect(components.length).toBeGreaterThan(0);
  });

  test.each(components)("%s has index.ts", (name) => {
    const indexPath = path.join(COMPONENTS_DIR, name, "index.ts");
    expect(fs.existsSync(indexPath)).toBe(true);
    // Remediation: Create src/components/<name>/index.ts with barrel exports.
    // See AGENTS.md Rule 3.
  });

  test.each(components)("%s has a styles file", (name) => {
    const stylesPath = path.join(COMPONENTS_DIR, name, `${name}.styles.ts`);
    expect(fs.existsSync(stylesPath)).toBe(true);
    // Remediation: Create src/components/<name>/<name>.styles.ts using
    // StyleSheet.create((theme) => ...) from react-native-unistyles.
    // See docs/design/nd-themes.md.
  });

  test.each(components)(
    "%s has a __tests__ directory with a test file",
    (name) => {
      if (KNOWN_UNTESTED.has(name)) {
        // Tracked debt — this component needs a test file added.
        // Remediation: Create src/components/<name>/__tests__/<name>.test.tsx
        // then remove this entry from KNOWN_UNTESTED.
        return;
      }
      const testDir = path.join(COMPONENTS_DIR, name, "__tests__");
      const tsxTest = path.join(testDir, `${name}.test.tsx`);
      const tsTest = path.join(testDir, `${name}.test.ts`);
      expect(fs.existsSync(testDir)).toBe(true);
      expect(fs.existsSync(tsxTest) || fs.existsSync(tsTest)).toBe(true);
      // Remediation: Create src/components/<name>/__tests__/<name>.test.tsx.
      // At minimum, test that the component renders without crashing.
      // See src/components/Button/__tests__/Button.test.tsx as reference.
    },
  );

  test("KNOWN_UNTESTED list is up to date (no stale entries)", () => {
    // If a component in KNOWN_UNTESTED now has tests, this test fails
    // reminding you to remove it from the skip list.
    for (const name of KNOWN_UNTESTED) {
      const tsxTest = path.join(
        COMPONENTS_DIR,
        name,
        "__tests__",
        `${name}.test.tsx`,
      );
      const tsTest = path.join(
        COMPONENTS_DIR,
        name,
        "__tests__",
        `${name}.test.ts`,
      );
      expect(fs.existsSync(tsxTest) || fs.existsSync(tsTest)).toBe(false);
      // Remediation: Remove this entry from KNOWN_UNTESTED — it now has a test file.
    }
  });
});
