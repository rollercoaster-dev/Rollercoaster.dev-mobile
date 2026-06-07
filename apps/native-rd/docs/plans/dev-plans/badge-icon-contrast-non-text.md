# Plan: badge icon contrast warning — fix threshold + copy

## Problem

The badge designer's Colors accordion (added in #250) shows a red caption
under the **Icon** tab when a user picks a Custom icon hex that fails WCAG
AA 4.5:1 against the fill:

> "Low contrast — text may be hard to read"

Two things are wrong with this:

1. **The threshold is wrong.** 4.5:1 is WCAG 2.1 SC 1.4.3, which governs
   _text and images of text_. The painted icon/monogram is neither — it's a
   non-text UI component, and the applicable clause is SC 1.4.11, which
   requires only **3:1**.
2. **The copy is wrong.** The string literally says "text may be hard to
   read", which mislabels what we're warning about.

The combined effect: users picking perfectly visible icon colors get flagged
as if they'd broken text accessibility.

## Decision

Keep the warning, fix both problems. The warning still serves a purpose at
the _real_ 3:1 floor — a white-on-white or near-tonal pick should still
surface a visibility hint — but the trigger and the copy need to match what
we're actually checking.

The Auto sentinel path remains exempt: it already routes through
`getSafeTextColor`, which picks max-contrast black/white. Warning on it
would be impossible-by-construction noise.

## Scope

- WCAG threshold change for the icon-contrast trigger only.
- i18n copy change for the warning string (EN/DE/pseudo).
- One additional test that pins the new threshold.

Out of scope: the warning's visual style (red `theme.colors.error`). A
softer "warning" tone might suit a 3:1-failure better than a hard error
colour, but that's a separate UX call.

## Files & changes

### `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeColorsAccordion.tsx`

- Swap import: drop `meetsWCAG`, add `getContrastRatio` (both from
  `../../utils/accessibility`).
- Add a named constant near `ICON_TAB_PREVIEW_GLYPH`:

  ```ts
  // WCAG 2.1 SC 1.4.11 — non-text UI components need 3:1, not the 4.5:1
  // text-grade ratio. The painted icon is a non-text component.
  const ICON_CONTRAST_MIN = 3;
  ```

- Rewrite the trigger (currently lines 79–83) as:

  ```ts
  // Only warn on explicit hex picks — the Auto sentinel already chooses
  // the high-contrast color, so warning on it would be noise.
  const showIconContrastWarning =
    iconRaw !== BADGE_COLOR_THEME_SENTINEL &&
    getContrastRatio(iconResolved, design.color) < ICON_CONTRAST_MIN;
  ```

### `apps/native-rd/src/screens/BadgeDesignerScreen/__tests__/BadgeColorsAccordion.test.tsx`

- Keep all 3 existing `describe("contrast warning")` cases — their verdicts
  do not change at 3:1 (white-on-white is still 1:1, black-on-white is
  still 21:1).
- Add a 4th case that pins the threshold:

  ```ts
  it("does not render at the non-text 3:1 threshold even when text 4.5:1 would fail", () => {
    // #888888 on #ffffff ≈ 3.54:1 — passes 3:1, fails 4.5:1.
    const handlers = makeHandlers();
    renderWithProviders(
      <BadgeColorsAccordion
        design={createDesign({ color: "#ffffff", iconColor: "#888888" })}
        {...handlers}
      />,
    );
    fireEvent.press(screen.getByLabelText("Icon"));
    expect(screen.queryByTestId("icon-contrast-warning")).toBeNull();
  });
  ```

  Without this, a future regression that flips the constant back to 4.5
  would pass CI.

### `apps/native-rd/src/i18n/resources/en/badgeDesigner.json`

`iconColor.contrastWarning`:

- before: `"Low contrast — text may be hard to read"`
- after: `"Low contrast — icon may be hard to see"`

### `apps/native-rd/src/i18n/resources/de/badgeDesigner.json`

`iconColor.contrastWarning`:

- before: `"Geringer Kontrast — Text könnte schwer lesbar sein"`
- after: `"Geringer Kontrast — Symbol könnte schwer erkennbar sein"`

"Symbol" reads more naturally than the loan-word "Icon" in German UI copy;
"schwer erkennbar" matches visibility, where the old "schwer lesbar"
(hard to read) only fits text.

### `apps/native-rd/src/i18n/resources/pseudo/badgeDesigner.json`

Regenerate the pseudo wrapper around the new EN string, preserving the
existing `[ … ························]` padding pattern.

## Files NOT touched

- `apps/native-rd/src/utils/accessibility.ts` — `meetsWCAG`,
  `getContrastRatio`, `getSafeTextColor` all stay; theme contrast tests
  still use `meetsWCAG`.
- `BadgeColorsAccordion.styles.ts` — `contrastWarning` style entry stays as
  `theme.colors.error`. See "Out of scope" above.
- `BadgeDesignerScreen.tsx` — the comment on lines 310–312 ("the accordion
  itself recomputes this for its own contrast warning") remains accurate.
- `apps/native-rd/docs/plans/dev-plans/issue-248-custom-badge-colors.md` —
  frozen plan artefact for the original feature; not rewriting history.

## Validation

| Step           | Command                                                      |
| -------------- | ------------------------------------------------------------ |
| Typecheck      | `bun run type-check`                                         |
| Lint           | `bun run lint`                                               |
| Targeted tests | `bun test --testPathPatterns BadgeColorsAccordion`           |
| Visual         | `npx expo run:ios` — badge designer → Colors → Icon → Custom |

Visual checks:

1. White-on-white (or any 1:1 pick) — warning still appears.
2. Black-on-white — no warning (as before).
3. Mid-grey (~`#888` on white) — **no warning** (previously warned).
4. Wording on screen reads "icon may be hard to see".
5. Auto sentinel selected — no warning regardless of fill.

## Estimate

- ~10–15 LOC changed, ~10 LOC added (one new test + the constant).
- 5 files touched, no new files.
- 1 PR, well under the 500-LOC cap. No generated content.
