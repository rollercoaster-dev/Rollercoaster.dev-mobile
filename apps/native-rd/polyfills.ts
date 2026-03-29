/**
 * Hermes polyfills required by Evolu
 * Must be imported before Evolu is loaded
 */

// Set prototype methods (TC39 stage 4, not yet in Hermes)
import "set.prototype.difference/auto";
import "set.prototype.intersection/auto";
import "set.prototype.isdisjointfrom/auto";
import "set.prototype.issubsetof/auto";
import "set.prototype.issupersetof/auto";
import "set.prototype.symmetricdifference/auto";
import "set.prototype.union/auto";

// AbortSignal.any (not yet in all Hermes versions)
if (typeof AbortSignal.any === "undefined") {
  // @ts-ignore -- runtime polyfill for Hermes; types exist but implementation does not
  AbortSignal.any = (signals: AbortSignal[]): AbortSignal => {
    const controller = new AbortController();
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort(signal.reason);
        return controller.signal;
      }
      signal.addEventListener("abort", () => controller.abort(signal.reason), {
        once: true,
        signal: controller.signal,
      });
    }
    return controller.signal;
  };
}

// AbortSignal.timeout (not yet in all Hermes versions)
if (typeof AbortSignal.timeout === "undefined") {
  // @ts-ignore -- runtime polyfill for Hermes; types exist but implementation does not
  AbortSignal.timeout = (ms: number): AbortSignal => {
    const controller = new AbortController();
    setTimeout(
      () => controller.abort(new DOMException("TimeoutError", "TimeoutError")),
      ms,
    );
    return controller.signal;
  };
}

// Promise.withResolvers (not yet in Hermes)
if (typeof Promise.withResolvers === "undefined") {
  // @ts-ignore -- runtime polyfill for Hermes; types exist but implementation does not
  Promise.withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}
