/**
 * Filter-function tests for the Sentry privacy posture (#971).
 *
 * Exercises only the pieces we own. Two pieces of the privacy posture are NOT
 * tested here because they're Sentry's responsibility, not ours:
 *
 * - Stack-frame filename rewriting → `createReactNativeRewriteFrames` (default
 *   integration) handles this; we don't reimplement it.
 * - Offline-noise drop → routed through `ignoreErrors` in `Sentry.init`,
 *   which is wired to the default `inboundFiltersIntegration`.
 */
import type { ErrorEvent, Breadcrumb } from "@sentry/react-native";

import { beforeBreadcrumbFilter, scrubEvent } from "../sentry-filters";

const makeEvent = (overrides: Partial<ErrorEvent> = {}): ErrorEvent => ({
  type: undefined,
  ...overrides,
});

describe("scrubEvent", () => {
  it("removes user identity injected by SDK/native context", () => {
    const event = makeEvent({
      user: { id: "installation-id", email: "test@example.com" },
    });
    const scrubbed = scrubEvent(event);
    expect(scrubbed.user).toBeUndefined();
  });

  it("redacts /Users/<name>/ paths in exception values", () => {
    const event = makeEvent({
      exception: {
        values: [
          {
            type: "Error",
            value: "ENOENT at /Users/joe/code/native-rd/src/foo.ts:12",
          },
        ],
      },
    });
    const scrubbed = scrubEvent(event);
    expect(scrubbed.exception?.values?.[0]?.value).not.toContain("/Users/joe");
    expect(scrubbed.exception?.values?.[0]?.value).toContain("/<redacted>");
  });

  it("reduces request URLs to host-only", () => {
    const event = makeEvent({
      request: {
        url: "https://example.com/path?email=test%40example.com&token=abc",
        headers: { authorization: "Bearer secret", cookie: "session=abc" },
        cookies: { session: "abc" },
        data: { note: "private" },
        query_string: "email=test%40example.com&token=abc",
      },
    });
    const scrubbed = scrubEvent(event);
    expect(scrubbed.request?.url).toBe("https://example.com");
    expect(scrubbed.request?.headers).toBeUndefined();
    expect(scrubbed.request?.cookies).toBeUndefined();
    expect(scrubbed.request?.data).toBeUndefined();
    expect(scrubbed.request?.query_string).toBeUndefined();
  });

  it("leaves request.url alone if it is unparseable", () => {
    const event = makeEvent({ request: { url: "not-a-url" } });
    const scrubbed = scrubEvent(event);
    expect(scrubbed.request?.url).toBe("not-a-url");
  });

  it("returns the event unchanged when there's nothing to scrub", () => {
    const event = makeEvent({
      exception: {
        values: [
          { type: "TypeError", value: "Cannot read properties of null" },
        ],
      },
    });
    const scrubbed = scrubEvent(event);
    expect(scrubbed.exception?.values?.[0]?.value).toBe(
      "Cannot read properties of null",
    );
  });

  it("removes arbitrary extras from final events", () => {
    const event = makeEvent({
      extra: { goalTitle: "Joe Czarnecki test goal" },
    });
    const scrubbed = scrubEvent(event);
    expect(scrubbed.extra).toBeUndefined();
  });

  it("re-scrubs breadcrumbs merged onto the final event", () => {
    const event = makeEvent({
      breadcrumbs: [
        { category: "console", message: "test@example.com" },
        {
          type: "http",
          category: "http",
          data: {
            url: "https://example.com/private?email=test%40example.com",
          },
        },
      ],
    });
    const scrubbed = scrubEvent(event);
    expect(scrubbed.breadcrumbs).toHaveLength(1);
    expect(scrubbed.breadcrumbs?.[0]?.data?.url).toBe("https://example.com");
  });
});

describe("beforeBreadcrumbFilter", () => {
  const make = (overrides: Partial<Breadcrumb> = {}): Breadcrumb => ({
    timestamp: 0,
    ...overrides,
  });

  it("drops console breadcrumbs", () => {
    expect(
      beforeBreadcrumbFilter(
        make({ category: "console", message: "user email: x@y.com" }),
      ),
    ).toBeNull();
  });

  it.each(["AsyncStorage", "secureStore", "expo-secure-store"])(
    "drops storage breadcrumbs: %s",
    (category) => {
      expect(beforeBreadcrumbFilter(make({ category }))).toBeNull();
    },
  );

  it("strips navigation data so route params don't leak", () => {
    const result = beforeBreadcrumbFilter(
      make({
        category: "navigation",
        data: { from: "Home", to: "GoalDetail", goalTitle: "Joe Czarnecki" },
      }),
    );
    expect(result).not.toBeNull();
    expect(result?.data).toBeUndefined();
  });

  it("reduces fetch URLs to host-only", () => {
    const result = beforeBreadcrumbFilter(
      make({
        category: "fetch",
        data: {
          url: "https://example.com/path?token=secret",
          method: "GET",
        },
      }),
    );
    expect(result?.data?.url).toBe("https://example.com");
    expect(result?.data?.method).toBe("GET");
  });

  it("reduces xhr URLs to host-only", () => {
    const result = beforeBreadcrumbFilter(
      make({
        category: "xhr",
        data: { url: "https://example.com/path?email=x@y.com" },
      }),
    );
    expect(result?.data?.url).toBe("https://example.com");
  });

  it("reduces generic http breadcrumb URLs to host-only", () => {
    const result = beforeBreadcrumbFilter(
      make({
        type: "http",
        category: "http",
        data: { url: "https://example.com/path?email=x@y.com" },
      }),
    );
    expect(result?.data?.url).toBe("https://example.com");
  });

  it("passes unrelated breadcrumbs through unchanged", () => {
    const crumb = make({ category: "ui.click", message: "tap" });
    expect(beforeBreadcrumbFilter(crumb)).toBe(crumb);
  });
});
