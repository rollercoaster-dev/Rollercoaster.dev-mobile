/**
 * React Native shim for @rollercoaster-dev/rd-logger.
 * The real package depends on Node built-ins (async_hooks, crypto, fs).
 * Only the Logger class is used in the app, so we provide a thin console wrapper.
 *
 * Bridge contract (#971): when `error()` is called, we extract the first Error
 * instance from args and hand it to `reportLoggerError`. Everything else
 * (message strings, meta objects, route params, file paths) is dropped at this
 * boundary — primitives can be PII, so a "primitives-only" sieve is unsafe.
 * Unknown logger scopes are silent inside the bridge; see services/sentry-report.ts.
 */
import { reportLoggerError } from "../services/sentry-report";

function findError(args) {
  for (const a of args) {
    if (a instanceof Error) return a;
    if (a && typeof a === "object") {
      if (a.error instanceof Error) return a.error;
      if (a.cause instanceof Error) return a.cause;
    }
  }
  return null;
}

export class Logger {
  constructor(name) {
    this._name = name || "app";
  }
  error(...args) {
    console.error(`[${this._name}]`, ...args);
    const err = findError(args);
    if (err) {
      reportLoggerError(this._name, err);
    }
  }
  warn(...args) {
    console.warn(`[${this._name}]`, ...args);
  }
  info(...args) {
    console.info(`[${this._name}]`, ...args);
  }
  debug(...args) {
    console.debug(`[${this._name}]`, ...args);
  }
}
