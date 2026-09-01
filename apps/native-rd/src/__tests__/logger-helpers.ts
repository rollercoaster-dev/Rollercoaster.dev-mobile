/**
 * Capture the `Logger` instance a module under test built at import time.
 *
 * `jest.config.js` maps `../shims/rd-logger` to a mock whose constructor returns
 * a fresh `{ error, warn, info, debug }` object per `new Logger(tag)`. Most
 * modules build exactly one at module load, so the instance the module holds is
 * the one this returns — asserting on it is asserting on what the module logged.
 *
 * Call this at module scope in the test file, NOT inside a test or `beforeEach`:
 * `jest.clearAllMocks()` wipes the constructor's `mock.calls`/`mock.results`,
 * which is what the lookup reads. The captured instance's own jest.fn()s survive
 * (their call history is cleared, which is what you want between tests).
 */
export function capturedLoggerFor(tag: string): {
  error: jest.Mock;
  warn: jest.Mock;
  info: jest.Mock;
  debug: jest.Mock;
} {
  // Required, not imported, so the caller controls import order: the module
  // under test must already have run.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const MockLogger = require("../shims/rd-logger").Logger as jest.Mock;
  const index = MockLogger.mock.calls.findIndex(
    (call: unknown[]) => call[0] === tag,
  );
  if (index < 0) {
    throw new Error(
      `No Logger was constructed with the tag "${tag}" — is the module under test imported above this call, and is its Logger still built at module load?`,
    );
  }
  return MockLogger.mock.results[index].value as {
    error: jest.Mock;
    warn: jest.Mock;
    info: jest.Mock;
    debug: jest.Mock;
  };
}
