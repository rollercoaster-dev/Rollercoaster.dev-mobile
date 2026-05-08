/**
 * Tests for the rd-logger shim's Sentry bridge (#971).
 *
 * Verifies that:
 *   1. Only `Error` instances reach the bridge (meta is dropped).
 *   2. Unknown logger scopes silently no-op.
 *   3. The bridge does not forward strings, route params, or wrapper objects.
 *
 * The test imports the shim by its relative path (`../rd-logger`) which does
 * NOT match the jest.config.js moduleNameMapper key `../shims/rd-logger`, so
 * the real shim loads — not the db-test stub.
 */
const mockReportLoggerError = jest.fn();

jest.mock("../../services/sentry-report", () => ({
  reportLoggerError: (scope: string, err: Error) =>
    mockReportLoggerError(scope, err),
}));

const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

import { Logger } from "../rd-logger";

beforeEach(() => {
  mockReportLoggerError.mockClear();
  consoleSpy.mockClear();
});

afterAll(() => {
  consoleSpy.mockRestore();
});

describe("rd-logger shim → Sentry bridge", () => {
  it("forwards an Error wrapped in `{ error }` meta", () => {
    const log = new Logger("test-scope");
    const err = new Error("boom");
    log.error("Failed thing", { error: err, title: "leak goal title" });

    expect(mockReportLoggerError).toHaveBeenCalledTimes(1);
    expect(mockReportLoggerError).toHaveBeenCalledWith("test-scope", err);
    // The meta object (with `title`) is NOT a separate argument to the bridge.
    const [, forwardedErr] = mockReportLoggerError.mock.calls[0];
    expect(forwardedErr).toBe(err);
  });

  it("forwards a flat Error argument", () => {
    const log = new Logger("test-scope");
    const err = new Error("flat");
    log.error("Failed", err);

    expect(mockReportLoggerError).toHaveBeenCalledWith("test-scope", err);
  });

  it("forwards an Error wrapped in `{ cause }` meta", () => {
    const log = new Logger("test-scope");
    const err = new Error("cause");
    log.error("Failed", { cause: err });

    expect(mockReportLoggerError).toHaveBeenCalledWith("test-scope", err);
  });

  it("does not call the bridge when no Error is present", () => {
    const log = new Logger("test-scope");
    log.error("user typed: leak goal title", { title: "leak", count: 5 });

    expect(mockReportLoggerError).not.toHaveBeenCalled();
  });

  it("uses the default 'app' scope when no name is provided", () => {
    const log = new Logger();
    const err = new Error("default scope");
    log.error("oops", err);

    expect(mockReportLoggerError).toHaveBeenCalledWith("app", err);
  });

  it("still console.errors regardless of bridge behavior", () => {
    const log = new Logger("noisy");
    log.error("string-only message", { not: "an error" });
    expect(consoleSpy).toHaveBeenCalled();
    expect(mockReportLoggerError).not.toHaveBeenCalled();
  });
});
