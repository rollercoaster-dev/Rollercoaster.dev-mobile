/**
 * Manual mock for @sentry/react-native.
 *
 * The real SDK ships ESM (`export {}` at the top of dist/js/index.js) which
 * Jest's babel-jest pipeline cannot parse without adding it to
 * `transformIgnorePatterns`. Mocking here is cheaper than transforming the
 * whole SDK, and the SDK has no test value in unit tests anyway — anything
 * that needs to assert what reaches Sentry should mock the same module
 * locally with the right spy shape.
 */
export const init = jest.fn();
export const wrap = <T>(c: T) => c;
export const captureException = jest.fn();
export const captureMessage = jest.fn();
export const addBreadcrumb = jest.fn();
export const setTag = jest.fn();
export const setUser = jest.fn();
export const setContext = jest.fn();
export const setExtra = jest.fn();
export const withScope = jest.fn(
  (
    cb: (scope: {
      setTag: (k: string, v: string) => void;
      setContext: (k: string, v: unknown) => void;
    }) => void,
  ) => {
    cb({
      setTag: jest.fn(),
      setContext: jest.fn(),
    });
  },
);
export const nativeCrash = jest.fn();
export const getCurrentScope = jest.fn(() => ({
  setTag: jest.fn(),
  setContext: jest.fn(),
  clear: jest.fn(),
}));
