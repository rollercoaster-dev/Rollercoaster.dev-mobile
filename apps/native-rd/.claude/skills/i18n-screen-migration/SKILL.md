---
name: i18n-screen-migration
description: Migrate a native-rd screen's literal display strings to i18next `t()` calls under Milestone 3. Use when the user references an open i18n milestone ticket (#68 Goals, #69 Focus Mode, #70/#71 evidence capture, #72 permissions, #73/#74 badges), says "migrate <screen> to t()", "populate the <ns> namespace", or starts a `feat/issue-<N>-i18n-*` branch. Bundles the per-PR workflow, the cross-namespace decision tree, the dynamic-key drift-guard contract, and the test-migration policy. Does NOT cover #61 native locale files, #62 format utilities, #63 ESLint rule, #66 Hermes spike, or the #76 closeout — those have their own per-issue plans.
metadata:
  author: rollercoaster.dev
  version: "1.0.0"
  sunset: "Delete this skill when milestone #3 (#76) closes. Tracked in docs/plans/milestone-3-i18n.md → Move to completed."
---

# i18n screen migration

The decision tree, JSON shape, drift-guard contract, and PR checklist live in **[`apps/native-rd/docs/i18n.md`](../../../docs/i18n.md)**. That is the source of truth — this skill is a workflow + trigger surface, not a re-statement.

Read these in order before starting any migration:

1. `docs/plans/milestone-3-i18n.md` — operational order and what's deferred.
2. `docs/i18n.md` — full conventions (one read is enough; this skill assumes you've done it).
3. The per-issue plan if one exists at `docs/plans/issue-<N>-i18n-*.md` — line-level scope and key tables. Issue #67's plan (`issue-67-i18n-welcome-newgoal-settings.md`) is the canonical template; mirror its shape when authoring a new one.

---

## Per-PR workflow

Order matters. Each step gates the next.

1. **Confirm readiness.** `cat src/i18n/resources/en/common.json` — should be ~2.4k. If it's `{}`, you're in the wrong phase; #65 hasn't landed.
2. **Read the screen.** `rg -n '"[A-Z][a-z]+|<Text[^>]*>[A-Z]' src/screens/<Screen>/<Screen>.tsx` to enumerate literal display strings. Cross-check `accessibilityLabel`, `accessibilityHint`, `placeholder`, `Alert.alert(...)` titles/messages, and any string inside a `setError(...)` call. Native crash/dev-only `Alert`s gated on `EXPO_PUBLIC_*` flags do **not** get migrated — they stay literal.
3. **Check for option-array drift risk.** Grep the screen for `.map(opt =>` and any module that exports `<X>Options` with `label`/`description` fields (e.g. `densityOptions`, `themeOptions`, `EVIDENCE_OPTIONS`). If the screen consumes one, you must strip the display strings out of the source module **in the same commit** as the screen migration (mirrors what #65 did to `themeOptions` and what #67 did to `densityOptions`).
4. **Populate `resources/en/<ns>.json`.** Keys top-level inside the namespace — never `screens.<ns>.*` (that nested shape was killed by PR #108). Group by user workflow, not component file name. Reuse `common:*` for anything cross-cutting; do not duplicate `common:actions.save` etc.
5. **Migrate the screen.** Pick the right hook form per the decision tree below. Convert call sites. For dynamic keys (template literals), confirm the union ↔ JSON pair is exhaustive in both directions.
6. **Regenerate pseudo.** `bun run gen:pseudo` from `apps/native-rd/`. The script auto-discovers — no script edit needed for new namespaces. Commit `en/<ns>.json` and `pseudo/<ns>.json` together.
7. **Migrate tests.** Switch hardcoded-English assertions to `i18n.t("ns:key")` lookups (see policy below).
8. **Add a `describe("pseudo locale")` block.** 3–5 representative keys per screen — title, body, CTA, error, dynamic-key sample. Pattern in `docs/i18n.md` § "Pseudo-render smoke tests". One key per screen is too thin; a developer reverting every string except the asserted one would still pass.
9. **Add drift-guard pairs** for every new template-literal `t()` call in `src/i18n/__tests__/option-key-parity.test.ts` — forward (union → JSON resolves) **and** reverse (JSON keyset === union). Forward-only misses orphan keys after a rename.
10. **Run the gates.** `bun run type-check && bun run lint && bun run test`. Lint catches accidental `useTranslation([...])` array form when scalar would do.
11. **Smoke under pseudo.** `EXPO_PUBLIC_I18N_PSEUDO=true` + full Metro restart (not reload — Metro caches resource bundles). Walk the migrated screens; every label should be bracketed/accented. Plain-English copy = missed `t()` call. `[…][…]` pattern = translated fragment concatenation (don't do that — use interpolation).
12. **Strip stale labels.** Issues opened during the wave-plan era carry `dep:blocked`. Remove the label as part of housekeeping.

---

## Decision tree

### Which hook form?

```
Is the screen entirely on common keys (actions, evidence types, theme labels)?
├─ Yes → useTranslation()            // bare; defaultNS = common
└─ No
   ├─ Does the screen reach into common keys via colon prefix?
   │  ├─ Yes → useTranslation(["<screen-ns>", "common"])
   │  │        Required: i18next's CustomTypeOptions typing rejects
   │  │        t("common:foo") from a scalar hook bound only to <screen-ns>.
   │  └─ No  → useTranslation("<screen-ns>")
```

**Pitfall:** if you used `useTranslation("settings")` then wrote `t("common:foo")`, strict TS will refuse. Either add `"common"` to the array, drop the `common:` prefix when the key is in your scoped ns, or move the lookup into a `labels.ts` helper.

### Colon prefix vs options-bag vs helper?

- **At a call site, reaching into another ns** → colon prefix: `t("common:theme.preview.title")`. **Not** the options bag.
- **Inside a `labels.ts` helper that takes a generic `TFunction`** → options bag: `t("evidenceTypes.photo.label", { ns: "common" })`. The helper can't know the caller's hook scope, so it forces the ns explicitly. This is the only legitimate use of the options-bag form.
- **Extract to `labels.ts` when** the same key (or template-built family like `evidenceTypes.<type>.*`) is consumed by ≥2 components. Single-consumer lookups stay inline.

### Dynamic-key contract

Whenever you build a key from a runtime value (template literal):

```tsx
densityOptions.map((opt) => t(`density.options.${opt.id}.label`));
```

You **must** add both assertions to `src/i18n/__tests__/option-key-parity.test.ts`:

```ts
// Forward — every union member resolves.
describe.each(densityOptions)("densityOptions[$id]", ({ id }) => {
  test("settings:density.options.<id>.label resolves", () => {
    const key = `settings:density.options.${id}.label` as const;
    expect(i18n.t(key)).not.toBe(key);
  });
});

// Reverse — no orphan JSON entries left behind after a rename.
test("settings:density.options keyset matches densityOptions", () => {
  const bundle = i18n.getResourceBundle("en", "settings") as {
    density: { options: Record<string, unknown> };
  };
  expect(new Set(Object.keys(bundle.density.options))).toEqual(
    new Set(densityOptions.map((o) => o.id)),
  );
});
```

`missingKeyHandler` is `__DEV__`-gated. Drift renders the key path as UI in prod silently.

---

## Test-migration policy

Two assertion shapes, both correct, picked by what the test proves:

```tsx
// (a) i18n.t() lookup — preferred. Survives copy tweaks; key path is the contract.
expect(screen.getByText(i18n.t("welcome:hero.title"))).toBeOnTheScreen();

// (b) Role-based with translated name — strongest when asserting interaction.
fireEvent.press(
  screen.getByRole("button", { name: i18n.t("common:actions.save") }),
);
```

**Never** hardcode the English literal. Reasons in `docs/i18n.md` § "Testing components that use `t()`". TL;DR: hardcoded literals can't distinguish a reverted-to-literal component from a real `t()` call, and rephrasing breaks every test orthogonally.

`testID` is fine where it already exists (e.g. `create-goal`, `new-goal-title`). Do **not** add new testIDs — that's #64, deferred.

No plurals (`_zero`/`_one`/`_other`) before #66. Render counts as a single string until the Hermes Intl spike lands.

---

## PR checklist (must-pass)

Pulled verbatim from `docs/i18n.md` § "Migration checklist", reproduced here so the agent doesn't have to re-open the doc:

- [ ] `bun run gen:pseudo` was run; `resources/pseudo/<ns>.json` is up to date and committed in the same commit as `resources/en/<ns>.json`.
- [ ] Accessibility labels and hints on touched components are translated too.
- [ ] No translated fragment concatenations (`{t("a")} {t("b")}`) — use interpolation instead.
- [ ] Inline cross-ns lookups use colon prefix, not the options bag.
- [ ] Every template-literal `t()` has both a forward and reverse drift-guard pair in `option-key-parity.test.ts`.
- [ ] Migrated screens have a `describe("pseudo locale")` block covering 3–5 representative keys.
- [ ] Test assertions use `i18n.t("ns:key")` lookups, not hardcoded English literals.
- [ ] Smoked under `EXPO_PUBLIC_I18N_PSEUDO=true` with Metro restart: no plain-English copy, no `[…][…]` patterns.
- [ ] `bun run type-check && bun run lint && bun run test` all green.
- [ ] Stale `dep:blocked` label removed from the issue (set during the wave plan, now obsolete).
- [ ] Husky `prepare-commit-msg` hook is active so DCO `Signed-off-by:` lands automatically. If `--no-verify` was used anywhere, append the trailer manually before push.

---

## Commit shape

One commit per namespace JSON + its screen + tests. Three migrations in one issue (like #67) = three commits. If a single commit balloons past ~300 lines, split test changes into a `refactor(native-rd): migrate <Screen> tests to t() lookups` commit. Reviewer ergonomics > commit purity.

Don't bundle unrelated screens into one PR even when they're "easy" — each namespace is supposed to be a disjoint write target so parallel agents on sibling tickets don't conflict.

---

## What this skill explicitly does not cover

- **#61 native German locale files** (`app.json` + `locales/<lng>.json`). Sequential after the parallel screen phase; has its own scope.
- **#62 format utilities** (`formatDate`, `formatEvidenceLabel`). Locale-aware utilities, not string migration.
- **#63 raw-string ESLint rule.** Post-ship cleanup; landing it earlier creates `eslint-disable` baselines that smear migration PRs.
- **#64 testID additions.** Deferred; reuse existing testIDs only.
- **#66 Hermes Intl spike.** Gates plural introduction; not on the English-only path.
- **#75 pseudo-locale snapshot tests.** This skill puts inline pseudo-render blocks in each screen test — that's lower-touch than #75's full snapshot tests, which come later.
- **#76 closeout.** Native-speaker review of German resources + manual locale-switch verification. Not engineering scope.

If the agent is working on any of the above, abandon this skill and read the relevant per-issue plan instead.

---

## Re-entry

If you `/clear` mid-migration:

1. `git log main..HEAD --oneline` — what's landed since.
2. `cat src/i18n/resources/en/<ns>.json` for the in-flight namespace — `{}` means start at step 4 above; populated means start at the screen migration.
3. `rg "useTranslation" src/screens/<Screen>` — hook form already chosen? If yes, infer the decision and continue.
4. Re-read this skill's "Per-PR workflow" section; pick up at the next unchecked step.
