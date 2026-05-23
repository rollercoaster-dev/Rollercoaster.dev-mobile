# Issue #67 — i18n: migrate Welcome, NewGoal, Settings screens

**Milestone:** #3 — native-rd i18n
**Position:** First of the parallel screen-migration phase under the 2026-05-18 shipping plan. Runs in parallel with #68 / #69 / #70 / #72 (no shared write target — each agent owns one namespace JSON).
**Parent epic:** #76 (German first-test path)
**Branch (when implementation starts):** `feat/issue-67-i18n-welcome-newgoal-settings`

## Why this is next

Per `docs/plans/milestone-3-i18n.md` (operational source of truth), the parallel-screen phase opens once #65 lands. PR #113 (merged 2026-05-21) populated `resources/en/common.json` with shared action labels, evidence type labels, theme option labels/descriptions, the `theme.picker` + `theme.preview` keys, and the `stepCard` / `a11y` subtrees. Every other `resources/en/<ns>.json` is still `{}`.

The milestone's first-test-path cut (`milestone-3-i18n.md:27-33`) lists #67 first because the three screens are small (296 LOC combined), share no cross-cutting copy with the other parallel tickets, and force an early sanity check on the `common` namespace consumption in product code (the Welcome screen and Settings screen both consume `common:theme.options.*`).

#64 (testIDs), #66 (Hermes spike), and #63 (raw-string lint) remain deferred to post-ship cleanup — the milestone doc has the full rationale (`milestone-3-i18n.md:49-58`).

## Goal

Populate `resources/en/welcome.json`, `resources/en/newGoal.json`, and `resources/en/settings.json` (+ regenerated `resources/pseudo/<ns>.json`) and migrate every literal display string in:

- `src/screens/WelcomeScreen/WelcomeScreen.tsx`
- `src/screens/NewGoalModal/NewGoalModal.tsx`
- `src/screens/SettingsScreen/SettingsScreen.tsx`
- `src/utils/density.ts` (strips `label` / `description` strings the way `useTheme.ts` was stripped in #65)

…to `t()` calls, so a German tester sees translated copy across the welcome flow, the new-goal modal, and the settings screen.

## Readiness

- ✅ Foundation closed (#988); `src/i18n/{index.ts,language.ts,pseudoTransform.ts,i18next.d.ts}` in place.
- ✅ Namespace refactor landed (PR #108). `NAMESPACES` already includes `welcome`, `newGoal`, `settings`; their `resources/en/*.json` files exist as `{}`.
- ✅ `common` namespace populated (#65 / PR #113). `common:actions.close`, `common:theme.*`, `common:a11y.*`, `common:stepCard.*` available for reuse.
- ✅ Pseudo-generation script auto-discovers files: `bun run gen:pseudo`.
- ✅ Drift guard test in `src/i18n/__tests__/i18n.test.ts` enforces NAMESPACES ↔ resource-bundle ↔ types alignment. (No new namespace registration needed — the three are already wired.)
- ⚠️ **#64 (testIDs) deliberately deferred.** Test-migration policy below explains how this issue handles assertions without depending on #64.

## Correction against the issue body

The issue body (rendered before the namespace refactor) names keys as `screens.welcome.*`, `screens.newGoal.*`, `screens.settings.*`. **That path is stale.** After PR #108 each screen has its own namespace JSON; keys are top-level within that namespace:

```tsx
const { t } = useTranslation("welcome");
t("hero.title"); // resources/en/welcome.json → { "hero": { "title": "Welcome to your ride." } }
```

Authority for this is `docs/i18n.md:77-84` (current truth) and `milestone-3-i18n.md`. The PR description should explicitly flag the namespace-path correction so reviewers don't expect the stale shape.

The issue's `dep:blocked` label is also stale (set when the wave plan ordered #64/#66 first). Strip it as part of this PR's housekeeping, or in a separate label-audit pass for #67/#68/#69/#70/#72 together.

## Scope per screen

### WelcomeScreen (`src/screens/WelcomeScreen/WelcomeScreen.tsx`)

Literals to migrate (line refs against `WelcomeScreen.tsx@HEAD`):

| Line  | Literal                                                                                                              | Key                          | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 30    | `Hey there 👋`                                                                                                       | `welcome:hero.greeting`      | Emoji stays inline in the value — the pseudo generator preserves it and translators may keep, drop, or move it.                                                                                                                                                                                                                                                                                                                                                       |
| 33    | `Welcome to your ride.`                                                                                              | `welcome:hero.title`         |                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 44-45 | `rollercoaster.dev is your personal goal tracker. Everything stays on your phone — your data, your pace, your ride.` | `welcome:intro.body1`        | App name `rollercoaster.dev` is brand — leave inline in the English string; flag for translator that it must stay verbatim.                                                                                                                                                                                                                                                                                                                                           |
| 49-50 | `First, let's pick a look that fits your brain. Tap a swatch — the whole app changes so you can see how it feels.`   | `welcome:intro.body2`        | Use the apostrophe escape (`let’s`) directly in JSON — drop the JSX `&apos;`.                                                                                                                                                                                                                                                                                                                                                                                         |
| 56    | `★`                                                                                                                  | —                            | Icon glyph, not translated.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 59    | `Daily reading`                                                                                                      | `common:theme.preview.title` | **Reuse `common`** — same sample card concept as the theme preview. Read the colon syntax via `t("common:theme.preview.title")` from the `welcome`-scoped hook.                                                                                                                                                                                                                                                                                                       |
| 61    | `3 of 5 days complete`                                                                                               | `welcome:sample.progress`    | **Decision:** the existing `common:theme.preview.progress` is `"3 of 5 done"` — different copy. Two options: (a) reconcile to one string and reuse `common`; (b) keep separate under `welcome:sample.progress`. Recommended: (b) for now — the WelcomeScreen sample card and the ThemeSwitcher preview card may diverge later and the copy is intentionally more explanatory on the welcome screen. Don't introduce plurals (`_one`/`_other`) — #66 still gates that. |
| 68    | `Your look (tap to preview)`                                                                                         | `welcome:themePicker.label`  |                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 79    | `Get Started`                                                                                                        | `welcome:cta.getStarted`     | Keep in `welcome` ns — phrase is screen-specific (other ctas in app are not "Get Started"). Don't conflate with `common:actions.next`.                                                                                                                                                                                                                                                                                                                                |
| 81    | `You can change this anytime in Settings.`                                                                           | `welcome:cta.footnote`       |                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

Suggested `resources/en/welcome.json` shape:

```jsonc
{
  "hero": { "greeting": "Hey there 👋", "title": "Welcome to your ride." },
  "intro": {
    "body1": "rollercoaster.dev is your personal goal tracker. Everything stays on your phone — your data, your pace, your ride.",
    "body2": "First, let’s pick a look that fits your brain. Tap a swatch — the whole app changes so you can see how it feels.",
  },
  "sample": { "progress": "3 of 5 days complete" },
  "themePicker": { "label": "Your look (tap to preview)" },
  "cta": {
    "getStarted": "Get Started",
    "footnote": "You can change this anytime in Settings.",
  },
}
```

### NewGoalModal (`src/screens/NewGoalModal/NewGoalModal.tsx`)

Already imports `useTranslation` and consumes `t("actions.close")` (line 60) — that's `common:actions.close` resolving via the default namespace. Keep that; don't re-import.

| Line | Literal                      | Key                                | Notes                                                                                         |
| ---- | ---------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| 29   | `Title is required` (state)  | `newGoal:errors.titleRequired`     | Validation message — set as `setTitleError(t("errors.titleRequired"))`.                       |
| 40   | `Failed to create goal`      | `newGoal:errors.createFailed`      |                                                                                               |
| 51   | `New Goal`                   | `newGoal:title`                    | Top-bar label.                                                                                |
| 54   | `X`                          | —                                  | Glyph, not translated. (Long-term `common:icons.close` could replace, but out of scope here.) |
| 68   | `Title` (Input label)        | `newGoal:fields.title.label`       |                                                                                               |
| 69   | `What do you want to learn?` | `newGoal:fields.title.placeholder` |                                                                                               |
| 84   | `Create Goal`                | `newGoal:cta.create`               | Keep specific — distinct from `common:actions.save`.                                          |

Switch the hook to scoped: `const { t } = useTranslation("newGoal");` — but then `t("actions.close")` must become `t("common:actions.close")` (or use a second `const { t: tCommon } = useTranslation()`). Pick whichever reads cleaner; the colon form is fewer lines and matches the convention in `docs/i18n.md:91`.

Suggested `resources/en/newGoal.json`:

```jsonc
{
  "title": "New Goal",
  "fields": {
    "title": {
      "label": "Title",
      "placeholder": "What do you want to learn?",
    },
  },
  "errors": {
    "titleRequired": "Title is required",
    "createFailed": "Failed to create goal",
  },
  "cta": { "create": "Create Goal" },
}
```

### SettingsScreen (`src/screens/SettingsScreen/SettingsScreen.tsx`) + density extraction

Already uses `useTranslation()` to flip the pseudo toggle (line 61). Add `t()` for every display string. Section titles are the entry point for the section's namespace cluster.

| Line | Literal                                                                    | Key                                                                                | Notes                                                                                                                                       |
| ---- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 34   | `Native crash unavailable`                                                 | —                                                                                  | Inside `triggerSentryNativeCrash`, only reachable when `EXPO_PUBLIC_SENTRY_DEBUG_TOOLS=true`. **Dev-only**, don't translate. Leave literal. |
| 35   | `Android native crash verification requires a release-mode preview build.` | —                                                                                  | Same. Dev-only.                                                                                                                             |
| 46   | `Content Density` (DensityPicker title)                                    | `settings:density.title`                                                           |                                                                                                                                             |
| 51   | `option.label` / `option.description` from `densityOptions`                | `settings:density.options.<id>.label`, `settings:density.options.<id>.description` | See density extraction below.                                                                                                               |
| 65   | `Language (dev)` (LanguagePicker title)                                    | `settings:language.title`                                                          | Section is `__DEV__`-gated. Translate anyway — pseudo-locale QA toggles in dev, and the string still appears on-screen.                     |
| 67   | `Pseudo locale`                                                            | `settings:language.pseudo`                                                         |                                                                                                                                             |
| 88   | `Settings` (ScreenHeader)                                                  | `settings:title`                                                                   | `ScreenHeader title={t("title")}` from a `useTranslation("settings")` hook in `SettingsScreen`.                                             |
| 103  | `About`                                                                    | `settings:about.title`                                                             |                                                                                                                                             |
| 104  | `App` (label) / `rollercoaster.dev` (value)                                | `settings:about.appLabel` / —                                                      | "App" label translates; `rollercoaster.dev` is brand identifier, stays.                                                                     |
| 106  | `Version` (label) / `0.1.0` (value)                                        | `settings:about.versionLabel` / —                                                  | "Version" label translates; the version number is data.                                                                                     |
| 114  | `Built with Expo + Evolu + Unistyles`                                      | `settings:about.builtWith`                                                         | Translate. Translator may keep product names verbatim — that's their call, per #76 review.                                                  |

#### Density extraction (parallels what #65 did to `themeOptions`)

`src/utils/density.ts` carries `densityOptions: { id; label; description }[]` with display strings — identical pattern to the `themeOptions` strip in #65.

1. Strip `label` / `description` from `densityOptions`. Export `densityOptions: readonly { id: DensityLevel }[]` (shape that minimises churn — `.map(o => o.id)` keeps working).
2. Move strings into `resources/en/settings.json` under `density.options.<id>.{label,description}`.
3. Update consumers — currently only `SettingsScreen.tsx`'s `DensityPicker` (lines 47-54) and any test/Storybook references.

Grep before implementing:

```sh
rg "densityOptions" apps/native-rd/src
```

Expected hits: `src/utils/density.ts` (definition), `src/screens/SettingsScreen/SettingsScreen.tsx` (consumer), possibly tests under `src/utils/__tests__/density.test.ts` or `src/hooks/__tests__/useDensity.test.ts`. Migrate them all in the same commit so the build stays green.

Suggested `resources/en/settings.json`:

```jsonc
{
  "title": "Settings",
  "density": {
    "title": "Content Density",
    "options": {
      "compact": {
        "label": "Compact",
        "description": "Tighter spacing (0.75×)",
      },
      "default": { "label": "Default", "description": "Standard spacing" },
      "comfortable": {
        "label": "Comfortable",
        "description": "Roomier spacing (1.25×)",
      },
    },
  },
  "language": {
    "title": "Language (dev)",
    "pseudo": "Pseudo locale",
  },
  "about": {
    "title": "About",
    "appLabel": "App",
    "versionLabel": "Version",
    "builtWith": "Built with Expo + Evolu + Unistyles",
  },
}
```

## Tests touched by this scope

| Test file                                                        | What changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/screens/WelcomeScreen/__tests__/WelcomeScreen.test.tsx`     | Existing assertions on `"Welcome to your ride."`, `"Your look (tap to preview)"`, `"Get Started"`, `"You can change this anytime in Settings."`, `"Daily reading"`, `"3 of 5 days complete"` either move to `t()`-lookups or become role-based. Pattern: `screen.getByText(i18n.t("welcome:hero.title"))` for visible-copy proof, or `screen.getByRole("button", { name: /get started/i })` for action assertions. The existing `getByRole("button", { name: /get started/i })` (line 92) is the gold standard — copy-tweak resilient. |
| `src/screens/NewGoalModal/__tests__/NewGoalModal.test.tsx`       | Update assertions on `"New Goal"`, `"Title"`, `"Create Goal"`, `"Close"`, `"Title is required"`, `"Failed to create goal"`. Mirror the pattern in `SettingsScreen.test.tsx:115` — `i18n.t("newGoal:title")` etc. The `getByLabelText("Close")` already works post-#65 (close uses `t("actions.close")`) — leave the assertion's literal as `i18n.t("actions.close")` to match the consumer.                                                                                                                                            |
| `src/screens/SettingsScreen/__tests__/SettingsScreen.test.tsx`   | Replace `getByText("Settings")`, `getByText("Content Density")`, `getByText("Compact")`/`"Default"`/`"Comfortable"`, density description strings, `"Language (dev)"`, `"Pseudo locale"`, `"About"`, `"App"`, `"Version"`, `"Built with Expo + Evolu + Unistyles"` with `i18n.t(...)` lookups. The Alert messages (`"Native crash unavailable"` etc. — lines 202, 205) stay literal because they're dev-only and not translated.                                                                                                        |
| `src/utils/__tests__/density.test.ts` (if it asserts on strings) | Move to structural assertions (option count, ids) like #65 did with `evidence.test.ts`. Confirm during implementation — grep before writing.                                                                                                                                                                                                                                                                                                                                                                                           |
| `src/screens/WelcomeScreen/WelcomeScreen.stories.tsx`            | Storybook may render the screen with the default i18n provider — if it works today it'll work after, but verify no story hard-codes labels.                                                                                                                                                                                                                                                                                                                                                                                            |

## Naming convention recap (matches `docs/i18n.md`)

- One JSON per screen-namespace, keys top-level inside the namespace (`welcome:hero.title`, not `screens.welcome.title`).
- Dotted paths, `lowerCamelCase` segments.
- From `common`, no namespace prefix on the call (default ns).
- From a screen namespace, use the colon prefix to reach `common`: `t("common:actions.close")`.
- Density option ids stay snake-style if the existing union is snake — confirm during implementation; today `DensityLevel` is `"compact" | "default" | "comfortable"`, all single-token lowercase, no decision needed.

## Pseudo-locale regeneration

After every edit to `resources/en/{welcome,newGoal,settings}.json`:

```sh
bun run gen:pseudo
```

Commit en + pseudo together. The pseudo generator preserves emoji (`👋`) and `{{interpolation}}` tokens — neither appears in this batch except the `👋` in `welcome:hero.greeting`, which the generator passes through verbatim. No interpolations are introduced here (we don't ship plurals before #66).

## Test-migration policy (without #64 testIDs)

Per `milestone-3-i18n.md:59-66`:

1. **Prefer accessibility-role queries.** `getByRole("button", { name: ... })` beats `getByText`. WelcomeScreen's existing role-based assertion (`__tests__/WelcomeScreen.test.tsx:92`) is the template.
2. **`getByText` is acceptable** for assertions that genuinely prove visible copy renders — title strings, density descriptions, the welcome footnote. Pseudo locale is the gate for missed `t()` calls; tests don't need to be it too.
3. **Don't add `testID` proactively.** `new-goal-title` and `create-goal` already exist on `NewGoalModal.tsx:79,87` — use them where the test benefits. Don't add new ones; that's #64.
4. **No plurals.** Keep `"3 of 5 days complete"` as a single string. When #66 lands and `_one`/`_other` become safe, this is a natural follow-up; the issue's plural shape (`{{count}} of {{total}} done`) is documented in `docs/i18n.md:107-117`.

## Acceptance criteria → evidence

| Issue criterion                                                                     | Evidence in this PR                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No raw display strings in these screens                                             | `grep -nE '"[A-Z][a-z]+                                                                                                                                                                                           | <Text[^>]\*>[A-Z]' src/screens/{WelcomeScreen,NewGoalModal,SettingsScreen}` returns only icon glyphs (`X`, `★`), brand identifiers (`rollercoaster.dev`), version data (`0.1.0`), and dev-only Alert copy. |
| Pseudo locale renders without broken layouts                                        | Smoke-test under `EXPO_PUBLIC_I18N_PSEUDO=true`: Welcome → Settings shows bracketed/accented copy. Footnote `"You can change this anytime in Settings."` pads ~40% — manually inspect for clipping in the footer. |
| Tests pass                                                                          | `bun run test` green. Test changes documented above. Existing role-based assertion on Get Started already i18n-resilient.                                                                                         |
| `screens.welcome.*` / `screens.newGoal.*` / `screens.settings.*` keyspace populated | Treat as satisfied by the corrected `welcome:*` / `newGoal:*` / `settings:*` keyspace per the namespace refactor (PR #108). PR description flags the correction.                                                  |

## Suggested commit shape

1. `feat(native-rd): populate welcome namespace and migrate WelcomeScreen` — `resources/en/welcome.json` + `resources/pseudo/welcome.json` + `WelcomeScreen.tsx` + test.
2. `feat(native-rd): populate newGoal namespace and migrate NewGoalModal` — `resources/en/newGoal.json` + `resources/pseudo/newGoal.json` + `NewGoalModal.tsx` + test.
3. `feat(native-rd): populate settings namespace and migrate SettingsScreen + density options` — `resources/en/settings.json` + `resources/pseudo/settings.json` + `SettingsScreen.tsx` + `src/utils/density.ts` + tests.

If any single commit balloons past ~300 lines, split out the test file changes (`refactor(native-rd): migrate WelcomeScreen tests to t() lookups`). Reviewer ergonomics over commit purity.

Each commit ships with its DCO trailer via the husky `prepare-commit-msg` hook. Do not bypass.

## Risks

- **`densityOptions` shape change is API-breaking inside the app.** Same pattern as #65's `themeOptions` strip; same mitigation — the TypeScript build is the gate, and the consumer list is short (just `SettingsScreen` + tests).
- **Welcome's brand string (`rollercoaster.dev`) being translated.** The translator may "fix" the dot or rewrite the URL; document under #76 that brand identifiers stay verbatim. Same applies to `"Built with Expo + Evolu + Unistyles"` — product names stay.
- **Existing test patterns differ.** `SettingsScreen.test.tsx` already does `i18n.t(...)` lookups (lines 115, 127, 141) — copy that pattern. `WelcomeScreen.test.tsx` and `NewGoalModal.test.tsx` use raw English — they migrate. Inconsistency between test files is short-lived; subsequent screen tickets converge on the SettingsScreen pattern.
- **Pseudo footer overflow.** The footnote `"You can change this anytime in Settings."` is near the bottom of the screen above the `Get Started` CTA. Padded ~40% under pseudo, it might wrap onto an extra line on small devices — that's a real bug to surface, not a test failure. Document in PR.
- **ND-voice consistency.** `welcome:hero.greeting` ("Hey there 👋") sets the tone — flag for native-speaker review under #76. German `de.json` may want a less casual greeting; that's a translator decision, not engineering.
- **Don't re-introduce `screens.welcome.*` etc.** If you find yourself typing `t("screens.welcome.title")`, you've reverted the namespace refactor. Re-read `docs/i18n.md:77-84`.

## Out of scope (explicit)

- Adding `testID` props (issue #64).
- ESLint rule for raw JSX strings (issue #63).
- Hermes Intl spike (issue #66) — no plurals in this PR.
- Other screens — Goals (#68), Focus Mode (#69), media capture (#70), permission-denied (#72), non-media capture (#71), badges (#73/#74).
- `formatDate` / `formatEvidenceLabel` locale-aware utilities (issue #62).
- Native locale files (`locales/en.json`, `locales/de.json`) — issue #61, runs after the screen migrations.
- German translations — generated first pass goes into `resources/de/<ns>.json` during the German-translation step (post-#67/#68/#69/#70/#72, before #76 closes).
- Translating dev-only Alert copy in `triggerSentryNativeCrash` — gated behind `EXPO_PUBLIC_SENTRY_DEBUG_TOOLS=true`; stays English.

## After this lands

`welcome.json`, `newGoal.json`, `settings.json` populated. Parallel migrations of #68 / #69 / #70 / #72 continue (and #71 picks up if scope allows before #76). German translation batch + #61 native locale files come after the parallel phase finishes. #76 closeout gate verifies the path end-to-end with native-speaker review.

## Re-entry instructions

If you `/clear` and come back:

1. Re-read `docs/plans/milestone-3-i18n.md` (operational strategy) and this file (issue plan).
2. `git log main..HEAD --oneline` to see what's landed.
3. Verify state per screen:
   - `cat src/i18n/resources/en/welcome.json` — populated → WelcomeScreen migration likely done; `{}` → start there.
   - `cat src/i18n/resources/en/newGoal.json` — same.
   - `cat src/i18n/resources/en/settings.json` — same. Also confirm `src/utils/density.ts` still carries display strings (= unfinished) or doesn't (= done).
4. Confirm `common.json` still populated (`wc -c src/i18n/resources/en/common.json` should be ~2.4k, not 3). If it isn't, something destructive happened — investigate before continuing.
5. Do **not** re-do the namespace refactor (already landed in PR #108) or re-author `common` (already landed in PR #113).
