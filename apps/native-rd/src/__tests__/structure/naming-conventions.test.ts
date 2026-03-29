import * as fs from "fs";
import * as path from "path";
import { COMPONENTS_DIR, HOOKS_DIR, getComponentDirs } from "./utils";

describe("Naming conventions", () => {
  describe("Component files", () => {
    const components = getComponentDirs();

    test.each(components)("%s directory name is PascalCase", (name) => {
      expect(name).toMatch(/^[A-Z][a-zA-Z0-9]*$/);
      // Remediation: Rename component directory to PascalCase (e.g. MyComponent).
    });

    test.each(components)("%s styles file matches <Name>.styles.ts", (name) => {
      const stylesFile = `${name}.styles.ts`;
      const files = fs.readdirSync(path.join(COMPONENTS_DIR, name));
      const stylesFiles = files.filter((f) => f.includes(".styles."));
      expect(stylesFiles).toContain(stylesFile);
      // Remediation: Rename styles file to <ComponentName>.styles.ts
    });

    test.each(components)("%s index.ts exports a named export", (name) => {
      const indexPath = path.join(COMPONENTS_DIR, name, "index.ts");
      // index.ts existence is enforced by component-structure.test.ts
      expect(fs.existsSync(indexPath)).toBe(true);

      const content = fs.readFileSync(indexPath, "utf-8");
      expect(content).toMatch(/export\s*\{|export\s+\*|export\s+default/);
      // Remediation: index.ts should contain export { Name } from './Name'
    });
  });

  describe("Test files", () => {
    const components = getComponentDirs();

    test.each(components)(
      "%s test file follows <Name>.test.tsx pattern (if tests exist)",
      (name) => {
        const testDir = path.join(COMPONENTS_DIR, name, "__tests__");
        if (!fs.existsSync(testDir)) {
          // No test dir — existence enforced by component-structure.test.ts.
          // Skip naming check since there's nothing to name-check.
          return;
        }

        const testFiles = fs
          .readdirSync(testDir)
          .filter((f) => f.endsWith(".test.tsx") || f.endsWith(".test.ts"));
        if (testFiles.length === 0) return;

        const expectedName = `${name}.test.tsx`;
        expect(testFiles).toContain(expectedName);
        // Remediation: Rename test file to <ComponentName>.test.tsx
      },
    );
  });

  describe("Hook files", () => {
    test('all hooks in src/hooks/ start with "use"', () => {
      expect(fs.existsSync(HOOKS_DIR)).toBe(true);

      const hookFiles = fs.readdirSync(HOOKS_DIR).filter((f) => {
        return (
          (f.endsWith(".ts") || f.endsWith(".tsx")) &&
          !f.endsWith(".test.ts") &&
          !f.endsWith(".test.tsx")
        );
      });
      expect(hookFiles.length).toBeGreaterThan(0);

      hookFiles.forEach((f) => {
        expect(f).toMatch(/^use[A-Z]/);
        // Remediation: Rename hook file to start with 'use' (e.g. useMyHook.ts).
        // Hooks must follow React naming convention.
      });
    });
  });
});
