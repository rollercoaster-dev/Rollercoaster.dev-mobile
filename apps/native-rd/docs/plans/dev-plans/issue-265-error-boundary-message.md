# Issue #265: Keep raw exception text out of the default ErrorBoundary UI

## Scope and intent

The default `ErrorBoundary` fallback currently prints `error.message`. An exception may contain private or internal detail and is not localized. Render the existing `common:errorBoundary.message` copy for every error while preserving error reporting and reset behavior.

## Intent Verification

- [x] A thrown error with nonempty, sensitive-looking message shows the localized generic message, never the raw text.
- [x] An empty error message shows the same localized generic message.
- [x] The generic message follows the selected i18n locale, including pseudo locale.
- [x] `reportError(error, { area: "render" })`, the alert, and Try Again remain functional.
- [x] The existing custom fallback API remains unchanged; it has no production caller and is outside this default fallback fix.

## Implementation

1. Replace the default fallback body's conditional error text with `i18n.t("common:errorBoundary.message")`.
2. Update the component tests to assert that raw exception text is absent, including when the message is empty and in pseudo locale.
3. Run focused tests, root type check, lint, and tests. Review the diff and acceptance criteria before publishing.

## Decisions

- Reuse the existing translation key; all three locales already define it. No new copy decision is needed.
- Keep the custom `fallback(error, reset)` callback contract. It is an explicit rendering override, and no production `ErrorBoundary` passes this prop. Removing its error argument would be an unrelated breaking change.

## Discovery Log

- 2026-09-24: Current `ErrorBoundary.tsx` renders `error.message || localizedMessage`; production usage relies on its default fallback. The test suite explicitly expects raw `Test error`, so it must change with the behavior.
- 2026-09-24: Manager reservation `codex/issue-265` passed; worktree `/private/tmp/rollercoaster-issue-265` is based on `56506497dd866c56c330a7673f9f3f9da9747b49`. Telegram start notice was rejected by automatic approval review and was not sent.
- 2026-09-24: Focused ErrorBoundary tests passed (9/9). Root type check and lint passed; lint reported existing warnings. Root `bun run test` exited successfully but Watchman denied app-suite startup in the sandbox. Running the full app suite explicitly with `--watchman=false` passed 221 suites and 10,457 tests.
- 2026-09-24: Adjacent retry and screen-reader focus gaps are already tracked in #266 and #267; neither is part of this message-copy change.

## Follow-ups

- No new follow-ups. A separate review of custom fallback callers would be warranted if production begins supplying a callback that renders raw error text. Existing ErrorBoundary follow-ups: #266 (retry) and #267 (screen-reader focus).
