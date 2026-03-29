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

const rnResolver = require("react-native/jest/resolver");
const stubPath = path.resolve(__dirname, "src/__tests__/mocks/rn-esm-stub.js");

module.exports = (request, options) => {
  const resolved = rnResolver(request, options);
  if (
    typeof resolved === "string" &&
    resolved.includes("specs_DEPRECATED/components/")
  ) {
    return stubPath;
  }
  return resolved;
};
