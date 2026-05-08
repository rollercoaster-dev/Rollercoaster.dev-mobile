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

  it.each([
    [
      "iOS file URI with filename",
      "ENOENT at file:///var/mobile/Containers/Data/Application/ABC/tmp/tax_return_2024.pdf",
      ["tax_return_2024.pdf", "file://", "/var/mobile/Containers"],
    ],
    [
      "Android content URI",
      "Could not open content://com.android.providers.media.documents/document/image%3A1234",
      ["content://", "com.android.providers"],
    ],
    [
      "PhotoKit ph:// URI",
      "Failed to load ph://9F983DBA-EC35-4C19-8B11-7C6F0E4E9D33/L0/001",
      ["ph://", "9F983DBA"],
    ],
    [
      "asset-library URI",
      "Asset not found: asset-library://asset/asset.JPG?id=ABC&ext=JPG",
      ["asset-library://", "asset.JPG"],
    ],
    [
      "legacy assets-library URI",
      "Asset not found: assets-library://asset/asset.MOV?id=XYZ&ext=MOV",
      ["assets-library://", "asset.MOV", "XYZ"],
    ],
    [
      "iOS sandbox path without scheme",
      "ENOENT at /private/var/mobile/Containers/Data/Application/X/Documents/notes.txt",
      ["notes.txt", "/var/mobile/Containers", "/private/var/mobile"],
    ],
    [
      "Android /data/user path",
      "Permission denied at /data/user/0/com.example.app/files/private.db",
      ["private.db", "/data/user/0"],
    ],
    [
      "Android shared storage path",
      "Permission denied at /storage/emulated/0/Download/tax_return_2024.pdf",
      ["tax_return_2024.pdf", "/storage/emulated/0"],
    ],
    [
      "Android sdcard path",
      "Failed to copy /sdcard/Documents/private_notes.md",
      ["private_notes.md", "/sdcard"],
    ],
  ])("redacts %s", (_label, message, leakyFragments) => {
    const event = makeEvent({
      exception: { values: [{ type: "Error", value: message }] },
    });
    const scrubbed = scrubEvent(event);
    const scrubbedValue = scrubbed.exception?.values?.[0]?.value ?? "";
    for (const fragment of leakyFragments) {
      expect(scrubbedValue).not.toContain(fragment);
    }
  });

  it("redacts email addresses in exception values", () => {
    const event = makeEvent({
      exception: {
        values: [
          {
            type: "Error",
            value: "Failed invite for test+pii@example.com",
          },
        ],
      },
    });
    const scrubbed = scrubEvent(event);
    expect(scrubbed.exception?.values?.[0]?.value).not.toContain(
      "test+pii@example.com",
    );
    expect(scrubbed.exception?.values?.[0]?.value).toContain(
      "[redacted-email]",
    );
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

  it("strips non-allowlisted custom contexts", () => {
    const event = makeEvent({
      contexts: {
        // Categorical SDK-managed entries — must be preserved.
        app: { app_version: "1.0.0" },
        device: { model: "iPhone15,2" },
        os: { name: "iOS", version: "17.0" },
        runtime: { name: "hermes", version: "0.74" },
        react_native_context: { jsEngine: "hermes" },
        // Arbitrary app-written context — must be removed.
        user_data: { title: "leak: goal title" },
        goal: { id: "abc", title: "leak" },
      },
    });
    const scrubbed = scrubEvent(event);
    expect(scrubbed.contexts?.app).toBeDefined();
    expect(scrubbed.contexts?.device).toBeDefined();
    expect(scrubbed.contexts?.os).toBeDefined();
    expect(scrubbed.contexts?.runtime).toBeDefined();
    expect(scrubbed.contexts?.react_native_context).toBeDefined();
    expect(scrubbed.contexts?.user_data).toBeUndefined();
    expect(scrubbed.contexts?.goal).toBeUndefined();
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

  it("removes arbitrary data from request breadcrumbs", () => {
    const result = beforeBreadcrumbFilter(
      make({
        category: "request",
        message: "https://example.com/path?email=x@y.com",
        data: {
          url: "https://example.com/path?email=x@y.com",
          method: "post",
          status_code: 201,
          headers: { authorization: "Bearer secret" },
          cookies: "session=abc",
          body: "test+pii@example.com",
          request_body_size: 123,
          arbitrary: "Joe Czarnecki",
        },
      }),
    );
    expect(result?.message).toBeUndefined();
    expect(result?.data).toEqual({
      url: "https://example.com",
      method: "POST",
      status_code: 201,
    });
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

  it("drops touch breadcrumbs", () => {
    expect(
      beforeBreadcrumbFilter(
        make({
          category: "touch",
          message: "tap",
          data: { path: "GoalDetail > title" },
        }),
      ),
    ).toBeNull();
  });

  it("drops ui.multiClick breadcrumbs", () => {
    expect(
      beforeBreadcrumbFilter(
        make({
          category: "ui.multiClick",
          message: "rage tap",
          data: { path: "GoalDetail > title" },
        }),
      ),
    ).toBeNull();
  });

  it("passes unrelated breadcrumbs through unchanged", () => {
    const crumb = make({ category: "ui.click", message: "tap" });
    expect(beforeBreadcrumbFilter(crumb)).toBe(crumb);
  });
});
