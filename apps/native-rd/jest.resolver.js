/**
 * Custom Jest resolver for native-rd
 *
 * Wraps the default React Native resolver to intercept files that
 * cause SyntaxError under Jest's CommonJS runtime.
 *
 * Problem: RN 0.81+ ships internal spec files under
 * `Libraries/.../specs_DEPRECATED/components/` that use `export var`
 * (ESM syntax). When RN's own mock setup calls `jest.requireActual`
 * on these files, Jest loads them as CommonJS, producing:
 *
 *   SyntaxError: Unexpected token 'export'
 *
 * These files define native component ViewConfigs that are irrelevant
 * in a test environment, so we redirect them to a minimal stub
 * (src/__tests__/mocks/rn-esm-stub.js) that exports an empty
 * __INTERNAL_VIEW_CONFIG and default object.
 *
 * This intercept is specifically for the `specs_DEPRECATED/components/`
 * path — all other RN resolution goes through the standard RN resolver.
 */
const path = require("path");

const fs = require("fs");

// RN 0.85 (SDK 56) moved the Jest resolver into `@react-native/jest-preset`.
const rnResolver = require("@react-native/jest-preset/jest/resolver");
const stubPath = path.resolve(__dirname, "src/__tests__/mocks/rn-esm-stub.js");

// Bun's symlink layout occasionally installs two copies of react-native@0.85.3
// in separate `.bun/` slots (driven by peer-dep variance from packages like
// reanimated-color-picker). RN's jest setup only mocks ONE copy, so the other
// crashes any test that loads FlatList/ScrollView via virtualized-lists.
// Canonicalize every react-native resolution to the copy that RN's resolver
// points at, so both code paths share one mocked surface.
const bunDir = path.resolve(__dirname, "../../node_modules/.bun");
const canonicalRnSlot = (() => {
  try {
    const slots = fs
      .readdirSync(bunDir)
      .filter((entry) => /^react-native@/.test(entry));
    if (slots.length <= 1) return null;
    // Pick the one RN's own resolver would use — that's the slot whose
    // mocks RN already registered via setup.js.
    const probe = require.resolve("react-native/package.json");
    const match = probe.match(/\.bun\/(react-native@[^/]+)/);
    return match ? match[1] : slots[0];
  } catch {
    return null;
  }
})();

module.exports = (request, options) => {
  const resolved = rnResolver(request, options);
  if (typeof resolved === "string") {
    if (resolved.includes("specs_DEPRECATED/components/")) {
      return stubPath;
    }
    if (canonicalRnSlot) {
      const dupMatch = resolved.match(/\.bun\/(react-native@[^/]+)\//);
      if (dupMatch && dupMatch[1] !== canonicalRnSlot) {
        return resolved.replace(
          `.bun/${dupMatch[1]}/`,
          `.bun/${canonicalRnSlot}/`,
        );
      }
    }
  }
  return resolved;
};
