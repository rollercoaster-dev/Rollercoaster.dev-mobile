/**
 * Custom Jest resolver that wraps the default RN resolver.
 * Intercepts RN 0.81+ internal ESM files (specs_DEPRECATED) that
 * cause SyntaxError when loaded via jest.requireActual.
 */
const path = require('path');

const rnResolver = require('react-native/jest/resolver');
const stubPath = path.resolve(__dirname, 'src/__tests__/mocks/rn-esm-stub.js');

module.exports = (request, options) => {
  const resolved = rnResolver(request, options);
  // Intercept the ViewConfig ESM spec files that cause parse errors
  if (typeof resolved === 'string' && resolved.includes('specs_DEPRECATED/components/')) {
    return stubPath;
  }
  return resolved;
};
