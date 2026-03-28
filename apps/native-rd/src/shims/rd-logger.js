/**
 * React Native shim for @rollercoaster-dev/rd-logger.
 * The real package depends on Node built-ins (async_hooks, crypto, fs).
 * Only the Logger class is used in the app, so we provide a thin console wrapper.
 */
export class Logger {
  constructor(name) {
    this._name = name || 'app';
  }
  error(...args) { console.error(`[${this._name}]`, ...args); }
  warn(...args) { console.warn(`[${this._name}]`, ...args); }
  info(...args) { console.info(`[${this._name}]`, ...args); }
  debug(...args) { console.debug(`[${this._name}]`, ...args); }
}
