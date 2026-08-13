# Development Plan: Issues #574 + #573 (combined)

**Branch**: `feat/issue-574-573-step-timing-editor`
**One PR, both issues.** #573 embeds #574's `StepDayGrid`; the user has decided
to ship them together. Do not propose splitting.

## Issue Summary

|                     |                                                                  |
| ------------------- | ---------------------------------------------------------------- |
| **#574**            | `[Storybook] StepDayGrid — themed month grid, any day reachable` |
| **#573**            | `[Storybook] StepTimingEditor — in-row date + \`depends on\``    |
| **Type**            | feature (Storybook-only; no screen wiring — that is #576)        |
| **Milestone**       | native-rd: Set B & C authoring (#6), Epic #570                   |
| **Complexity**      | **LARGE** (~700–850 lines incl. stories + tests)                 |
| **Estimated Lines** | #574 ~250–350 · #573 ~400–500 · combined ~700–850                |
| **Commits**         | 7                                                                |

Both issues were **rescoped 2026-08-13**. The rescoped bodies are the authoritative
spec. The design of record is
`apps/native-rd/prototypes/screen-redesign/Set BC D Prototype.html`
(801 lines, added in commit `3e76787`, PR #583) — **not** `Set BC B Prototype.dc.html`,
whose `DUE` / `EXP` / `WHO` arrays are demo fixtures.

> **Scope reality check.** ~750 lines is over the ~500-line single-PR guideline. It is
> accepted here because (a) the two components are one interaction that cannot be
> reviewed apart, (b) roughly half the volume is stories and tests, and (c) the
> component boundary between them is clean, so the diff reads as two files plus a
> shared barrel. The commit sequence below keeps each commit independently
> type-checking so a reviewer can walk it.

## Intent Verification

Observable criteria a reviewer can check by running Storybook or reading the tests.

**#574 — `StepDayGrid`**

- [ ] From the `Unset` story, tapping `‹` twelve times reaches the same month one year
      earlier, and tapping a day there fires `onChange` with that day's `YYYY-MM-DD` —
      i.e. no month is unreachable and no day is off-limits.
- [ ] A day strictly before `now` renders in the quiet treatment **and still fires
      `onChange`** when tapped; nothing on the grid is ever `disabled` or
      `accessibilityState={{ disabled: true }}` (grep the component for `disabled` →
      zero hits).
- [ ] Tapping the currently selected day fires `onChange(null)`.
- [ ] A month whose 1st falls on a Sunday renders exactly 6 leading blanks
      (Monday-first); a month whose 1st is a Monday renders 0.
- [ ] A day carrying three `marks` renders two ordinal badges plus one overflow badge,
      and its `accessibilityLabel` names that other steps sit there.
- [ ] Passing `locale="de"` renders German month and weekday names (via `Intl`, not a
      hand-written month array).
- [ ] `now` is a required prop; the component body contains no `new Date()` /
      `Date.now()` reading the wall clock (same discipline as
      `resolveStepDependencyBand`).

**#573 — `StepTimingEditor`**

- [ ] A step with `afterStepTitle: "Inspection & labels"` and `dueAt` set renders **two**
      timing lines whose text is byte-identical to what `TimelineStep`'s `MetadataBand`
      renders for the same data (asserted directly in a test, not by eye).
- [ ] An unset, non-completed step renders exactly **one** affordance reading `＋ when?`
      — not two chips.
- [ ] A **completed** unset step renders **no** `＋ when?` at all; a completed step that
      already has timing still shows its lines.
- [ ] Tapping the timing line expands the editor and flips its
      `accessibilityState.expanded` to `true`; the editor's first control receives
      accessibility focus; collapsing returns focus to the timing line.
- [ ] Picking a day, then collapsing **without** `Done`, leaves `onCommit` uncalled — the
      draft is discarded.
- [ ] `Done` fires `onCommit({ dueDate, afterStepId })` exactly once with the draft
      values; `Clear` fires `onClear()` and collapses.
- [ ] With a draft day strictly before the dependency's own day, the ordering note
      renders as plain body text — and the rendered subtree contains no
      `accessibilityRole="alert"`, no icon glyph, no `disabled` prop, and no theme
      `error`/`danger` colour token.
- [ ] The candidate list excludes the editing step itself, includes sub-steps, marks the
      current selection, marks completed candidates as completed, and offers `nothing`.
- [ ] A step whose goal has no other steps shows the empty-state copy instead of an empty
      scroll box.
- [ ] The strings `blocked`, `overdue`, `late`, `deadline`, `missing`, `needed` appear
      nowhere in either component's source or its i18n-free copy defaults (grep test).

## Dependencies

| Issue / PR | Title                                           | Status                | Type                                                                                                                                                                                                      |
| ---------- | ----------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #574       | `StepDayGrid`                                   | 🟢 In this PR         | Blocker for #573 — satisfied by shipping together                                                                                                                                                         |
| #454       | Schema: step dependency + due-date fields       | ✅ Merged             | Prior art — `afterStepId` / `dueAt` columns, `resolveStepDependencyBand`                                                                                                                                  |
| #571       | Neutral past-tense expected date                | ✅ Merged (`742f6bb`) | Prior art — `waitingOnExpectedIsPast`, strict `<`, injected `now`                                                                                                                                         |
| #583       | Direction D prototype                           | ✅ Merged (`3e76787`) | Design of record                                                                                                                                                                                          |
| PR #582    | `refactor/animated-sheet-lift`                  | 🟡 Open               | **Not a dependency.** No sheet in this design — confirmed: neither component imports `AnimatedSheet`, `Modal`, or any scrim. #582 lands on its own merits. **Do not rebase onto it, do not wait for it.** |
| #575       | Edit Goal step rows — one pressable timing line | 🟡 Open               | Runs alongside; owns the _row_, this issue owns the _timing line + editor_                                                                                                                                |
| #576       | Wire to `updateStep`                            | 🟡 Open               | Downstream — owns `YYYY-MM-DD` → local-midnight `DateIso` conversion                                                                                                                                      |

**Status**: ✅ All dependencies met. `has_blockers: false` — #573's only blocker (#574)
ships in the same PR.

## Objective

Ship two presentational Storybook components that together replace the retired
`StepDueDateSheet` / `StepDependencySheet` pair:

1. `StepDayGrid` — a themed, unbounded, Monday-first month grid where **every** day is
   reachable and other steps' days are marked on it.
2. `StepTimingEditor` — the in-row timing line plus the editor it expands into: the
   grid, a `Depends on` picker, the neutral ordering note, and a `Clear` / `Done`
   footer.

No screen wiring, no DB writes, no i18n resource keys (copy is caller-supplied with
English defaults — the D7 / D9 convention). No `AnimatedSheet`, no `Modal`, no scrim.

## The prototype, transcribed

Read from `Set BC D Prototype.html`. Pinned instant: **Wed 24 June 2026**
(`TODAY_ISO = "2026-06-24"`). Use the same instant in stories and tests so a reviewer
can hold the prototype and Storybook side by side.

**Grid** (`calendarHtml`, `.day` / `.mark` CSS):

| Prototype                                            | RN translation                                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `lead = (first.getDay() + 6) % 7`                    | Monday-first leading blanks — port verbatim                                             |
| `.day` 40px tall, 7-col grid, `gap: 2px`             | `minHeight: 44` (a11y floor beats the prototype's 40)                                   |
| `.day.is-today { border-color: ink }`                | today ring: `borderWidth.thick` + `colors.border`                                       |
| `.day.is-past { color: faint }`                      | `colors.textMuted` — quieter, **never disabled**                                        |
| `.day.is-sel` blue fill + ink border + hard shadow   | `colors.primary` bg, `colors.border` border, `shadowStyle(theme, "cardElevationSmall")` |
| `.mark` 13px pill, mint bg, ink border, ≤2 then `+`  | ordinal badges under the number; 3rd+ collapses to one overflow badge                   |
| `.day.is-sel .mark { background: #fff }`             | badge gets its own ground on the filled day                                             |
| `font-variant-numeric: tabular-nums`                 | `fontVariant: ["tabular-nums"]` on the day number                                       |
| `.legend` "badges mark days your other steps sit on" | caller-supplied `legendLabel`, same default                                             |

**Editor** (`editorHtml`, `afterHtml`, `noteHtml`):

- Question `When do you want this done?` — headline font, `size.sm`-ish.
- Sub-line `Your intent, not a deadline. A passed date never reads as "late."`
- `Depends on` field label (mono, uppercase, letter-spaced, `journey`/green ink).
- Collapsed picker button shows the current candidate's ordinal badge + title, or the
  `nothing` placeholder, with a caret.
- Expanded: a `nothing` option first, then every step and sub-step except this one;
  sub-steps indented (`.after-opt.is-child { margin-left: 14px }`); completed candidates
  render `✓` in the ordinal slot; the selection carries a `●` tick.
- Note (`noteHtml`) renders **only** when `draft.due && draft.after && target.due &&
draft.due < target.due` — a left-rule quiet panel, body weight, no icon.
- Footer: `.btn-clear` (fixed width, quiet) + `.btn-done` (flex 1, primary).

**Row behaviour** (`rowHtml`, `parkOpenRow`):

- `showTiming = lines.length > 0 || !step.done` — a completed step with no timing shows
  nothing.
- `aria-expanded` on the timing button.
- `parkOpenRow()` scrolls the opened row to the top of the list. The prototype comments
  that `scrollTo({behavior:"smooth"})` silently no-ops on that container — the RN
  equivalent lives host-side (see D6).

## Decisions

| ID      | Decision                                                                                                                                                                                                                                                                                                                                           | Alternatives Considered                                                            | Rationale                                                                                                                                                                                                                                                                                                                                                                                         |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1**  | Two sibling component directories, `src/components/StepDayGrid/` and `src/components/StepTimingEditor/`, each with `index.ts` + `.tsx` + `.styles.ts` + `.stories.tsx` + `__tests__/`. `StepTimingEditor` imports the grid via its barrel.                                                                                                         | One directory with the grid as a `.parts.tsx`; grid nested under the editor.       | The grid is independently specified (#574), independently story'd, and #576/#575 may reuse it. Sibling dirs match `TimelineStep` / `TimelineNode`.                                                                                                                                                                                                                                                |
| **D2**  | `StepDayGrid` emits plain `YYYY-MM-DD` strings and never touches `DateIso`. All internal date maths is on **local** `Date(y, m, d)` triples + lexicographic string compare, exactly as the prototype does.                                                                                                                                         | Emit `DateIso`; use `Date.parse` on ISO strings.                                   | #574 is explicit: the branded-`DateIso`-at-local-midnight conversion is #576's job. Lexicographic compare on zero-padded `YYYY-MM-DD` is total-order-correct and dodges every timezone trap.                                                                                                                                                                                                      |
| **D3**  | Past/future classification uses **string compare against a `YYYY-MM-DD` derived from `now` in local time**, strict `<` — mirroring `waitingOnExpectedIsPast`'s strict `<` (queries.ts D4) and the prototype's `key < TODAY_ISO`. A day equal to today's key is **not** past.                                                                       | `Date.parse(key) < now.getTime()`.                                                 | `Date.parse("2026-06-24")` is UTC-midnight; `now` is local — that comparison flips sign for anyone east of UTC on the boundary day. The whole grid is day-granular, so day-granular compare is the correct instrument. Strictness matches #571.                                                                                                                                                   |
| **D4**  | Month/weekday names via `new Intl.DateTimeFormat(locale, …)`, memoised per `(locale, month)`. Weekday headers generated from a known Monday (`Date(2026, 5, 22)`) + `weekday: "narrow"`.                                                                                                                                                           | Hand-written `MONTHS` array (as the prototype has); `toLocaleDateString` per cell. | #574 forbids hand-assembly. Hermes ships `Intl` locale data on-device (verified in the #66 spike; `formatDate` carries the note). `formatDate` itself is wrong for headers — it always emits day+year.                                                                                                                                                                                            |
| **D5**  | `StepTimingEditor` owns its expanded state internally (uncontrolled), and additionally accepts optional `expanded` + `onExpandedChange` for a host that must enforce "only one editor open at a time".                                                                                                                                             | Fully controlled only; fully uncontrolled only.                                    | #573 says the component owns expanded state, _and_ that only one editor may be open at a time. A host with N rows cannot enforce that without a controlled escape hatch. Uncontrolled default keeps the stories and #575 simple.                                                                                                                                                                  |
| **D6**  | Scroll-to-top on expand is **requested, not performed**: `onExpand?: (rowRef: RefObject<View \| null>) => void` hands the host the row's own root ref so it can `measureLayout` against its `ScrollView` and set the offset. A dedicated story (`InsideAScrollingList`) implements the host side and demonstrates the behaviour.                   | Component owns a `ScrollView` ref prop; component calls `scrollIntoView` itself.   | The component is presentational and does not own the list. Precedent: `EditModeScreen`'s `dragScrollController` / `scrollInstrumentation` split, and `EditGoalStepRow`'s `registerRowLayout`. The requirement ("set the scroll offset explicitly on expand") is still demonstrably met, in the story and in #575.                                                                                 |
| **D7**  | All copy is caller-supplied props with English defaults; **no** new keys in `src/i18n/resources/en/*.json` in this PR.                                                                                                                                                                                                                             | Add an `editGoal:timing.*` namespace now.                                          | The D7/D9 convention every Storybook-first component in this epic follows (`AnimatedSheet`, `EditGoalStepRow`). #576 is the `[Integrate]` issue and owns `t()` wiring; adding keys now would ship dead strings and churn `pseudo/`.                                                                                                                                                               |
| **D8**  | The row's truth lines are rendered from **pre-formatted, pre-resolved props** (`afterStepTitle`, `afterStepIsCompleted`, `dueDateLabel`) and composed with the same interpolation shapes as `timelineJourney:step.metadata.*`. Parity is asserted by a test that renders `TimelineStep`'s band and this component's line and compares the strings. | Call `resolveStepDependencyBand` inside the editor; re-derive the copy.            | The resolver reads a DB row shape the Storybook component must not depend on. Parity is a _test_ obligation, not a coupling obligation — and a test catches drift that a shared import would only hide.                                                                                                                                                                                           |
| **D9**  | **No animation.** The editor appears/disappears without the prototype's 160ms `unfold`.                                                                                                                                                                                                                                                            | `useAnimationPref()` + reanimated `withTiming`, as `AnimatedSheet` does.           | `useAnimationPref` reads Evolu (`useQuery(userSettingsQuery)`), which a presentational Storybook component must not require. Threading `animationPref` as a prop is doable but is pure addition on an already-oversized PR. Noted as a follow-up; the prototype already gates the unfold behind `prefers-reduced-motion`, so shipping it un-animated is the accessible default, not a regression. |
| **D10** | `marks` labels are **caller-supplied strings** (`"1"`, `"a"`, `"b"`), not derived.                                                                                                                                                                                                                                                                 | Take step objects and derive ordinals with `toLetterOrdinal`.                      | Ordinal assignment is the list's business (`TimelineStep` already does `toLetterOrdinal(index)`), and the grid must stay a pure presentational input.                                                                                                                                                                                                                                             |
| **D11** | The candidate list is a plain in-editor `ScrollView` with `maxHeight`, not a `FlatList`, not a sheet.                                                                                                                                                                                                                                              | `FlatList`; a modal picker (as `EditGoalStepRow`'s nest-under picker uses).        | A goal has tens of steps at most; virtualising inside an already-scrolling parent is the classic nested-VirtualizedList warning. A modal is explicitly forbidden by #573.                                                                                                                                                                                                                         |

## Affected Areas

**New files**

- `src/components/StepDayGrid/StepDayGrid.tsx` — component (~180 lines)
- `src/components/StepDayGrid/StepDayGrid.styles.ts` — themed styles (~90)
- `src/components/StepDayGrid/monthGrid.ts` — pure date helpers (~70)
- `src/components/StepDayGrid/index.ts` — barrel
- `src/components/StepDayGrid/StepDayGrid.stories.tsx` — 6 stories + matrix (~150)
- `src/components/StepDayGrid/__tests__/StepDayGrid.test.tsx` (~140)
- `src/components/StepDayGrid/__tests__/monthGrid.test.ts` (~80)
- `src/components/StepTimingEditor/StepTimingEditor.tsx` — timing line + editor (~230)
- `src/components/StepTimingEditor/StepTimingEditor.parts.tsx` — truth lines, candidate picker, ordering note (~170)
- `src/components/StepTimingEditor/StepTimingEditor.styles.ts` (~140)
- `src/components/StepTimingEditor/index.ts` — barrel
- `src/components/StepTimingEditor/StepTimingEditor.stories.tsx` — 10 stories + matrix (~230)
- `src/components/StepTimingEditor/__tests__/StepTimingEditor.test.tsx` (~200)
- `src/components/StepTimingEditor/__tests__/readOutParity.test.tsx` (~70)

**Existing files touched**

- None required. `src/db/queries.ts`, `src/utils/format.ts`, and the i18n resources are
  **read-only references** for this PR. If a barrel at `src/components/index.ts` exists
  and lists components, add both there; otherwise leave it.

## Exact prop signatures

### `StepDayGrid`

```ts
/** A day another step already sits on, with its list ordinal ("1", "2", "a", "b"). */
export interface StepDayMark {
  /** `YYYY-MM-DD`. */
  date: string;
  /** The other step's ordinal badge text. Caller-assigned (D10). */
  label: string;
}

export interface StepDayGridProps {
  /** Selected day as `YYYY-MM-DD`, or null for no day. */
  value: string | null;
  /**
   * Required. Never read the clock inside this component — the same convention
   * `resolveStepDependencyBand` follows (`src/db/queries.ts`), so stories and tests
   * pin a fixed instant. Used only to derive today's ring and past/future quieting.
   */
  now: Date;
  /** Days other steps sit on. At most two badges render per day, then an overflow badge. */
  marks?: readonly StepDayMark[];
  /** Fires with the tapped day, or `null` when the selected day is tapped again. */
  onChange: (next: string | null) => void;
  /** BCP-47 tag for month + weekday names — pass `i18n.language` from the caller. */
  locale?: string;

  // --- Copy (caller-supplied, English defaults — D7). ---
  /** a11y label for the previous-month control. Default: "Previous month". */
  previousMonthLabel?: string;
  /** a11y label for the next-month control. Default: "Next month". */
  nextMonthLabel?: string;
  /** Quiet caption under the grid. Default: "badges mark days your other steps sit on". */
  legendLabel?: string;
  /**
   * Appended to a day's a11y label when other steps sit there.
   * Default: (n) => n === 1 ? "1 other step here" : `${n} other steps here`.
   */
  marksA11ySuffix?: (count: number) => string;
  /** testID root; day cells get `${testID}-day-${iso}`. */
  testID?: string;
}
```

### `StepTimingEditor`

```ts
/** A step (or sub-step) this one may depend on. */
export interface StepTimingCandidate {
  id: string;
  title: string;
  /** Ordinal badge text — "1", "2", "a" (D10). */
  label: string;
  /** True for a sub-step: indents the row, matching the prototype's `.is-child`. */
  isSubStep?: boolean;
  /** Renders the ordinal slot as a check and the title in the completed treatment. */
  isCompleted?: boolean;
  /** This candidate's own day, `YYYY-MM-DD` or null — feeds the ordering note. */
  dueDate: string | null;
  /** This candidate's day, pre-formatted for the active locale (`formatDate`). */
  dueDateLabel?: string;
}

/** Draft values handed back on commit. */
export interface StepTimingValue {
  /** `YYYY-MM-DD` or null. Conversion to a branded `DateIso` is #576's job. */
  dueDate: string | null;
  /** Candidate id, or null for `nothing`. Unvalidated by design. */
  afterStepId: string | null;
}

export interface StepTimingEditorProps {
  /** Current committed timing for this step. */
  value: StepTimingValue;
  /** Required, injected — never read the clock inside (same rule as StepDayGrid). */
  now: Date;
  /**
   * Every step and sub-step in the goal **except this one** — the caller filters.
   * Empty array is a supported state (a goal's first step) and renders the empty copy.
   */
  candidates: readonly StepTimingCandidate[];
  /**
   * Whether this step is completed. A completed step with no timing renders **no**
   * `＋ when?` — nothing is left to plan on it — but still shows timing it has.
   */
  isCompleted?: boolean;
  /**
   * The current dependency's title, pre-resolved by the caller the way
   * `resolveStepDependencyBand` resolves it (unresolvable → null → no `after` line).
   */
  afterStepTitle?: string | null;
  /** Whether that dependency is completed — drives the `· done ✓` suffix. See OQ-1. */
  afterStepIsCompleted?: boolean;
  /** `value.dueDate` pre-formatted for the active locale via `formatDate` (D8). */
  dueDateLabel?: string | null;
  /** Days other steps sit on, forwarded to the grid. */
  marks?: readonly StepDayMark[];
  /** BCP-47 tag, forwarded to the grid and used for nothing else. */
  locale?: string;

  /** Fires on `Done` with the draft. Never fires on collapse-without-Done. */
  onCommit: (next: StepTimingValue) => void;
  /** Fires on `Clear` — removes both the date and the dependency. */
  onClear: () => void;

  /** Controlled expansion (D5). Omit for uncontrolled. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /**
   * Fired when the row expands, with this row's root `View` ref, so the host can
   * `measureLayout` against its ScrollView and park the row at the top of the list
   * (D6). Without it the editor can unfold below the fold and the tap reads as
   * having done nothing.
   */
  onExpand?: (rowRef: React.RefObject<View | null>) => void;

  // --- Copy (caller-supplied, English defaults — D7). ---
  /** Unset affordance. Default: "＋ when?" */
  whenPromptLabel?: string;
  /** Editor question. Default: "When do you want this done?" */
  questionLabel?: string;
  /** Sub-line. Default: `Your intent, not a deadline. A passed date never reads as "late."` */
  intentSubLabel?: string;
  /** Field label above the dependency control. Default: "Depends on" */
  dependsOnLabel?: string;
  /** Placeholder + clear option. Default: "nothing" */
  nothingLabel?: string;
  /** Copy when `candidates` is empty. Default: "No other steps in this goal yet." */
  noCandidatesLabel?: string;
  /** Footer buttons. Defaults: "Clear" / "Done". */
  clearLabel?: string;
  doneLabel?: string;
  /**
   * The neutral ordering note. Default:
   * (title, date) => `${title} needs to be done first, and it sits on ${date}. ` +
   *   `This one lands before it — that's allowed, it just won't read in order.`
   */
  orderingNote?: (dependencyTitle: string, dependencyDate: string) => string;
  /** a11y label on the timing line. Default: "Timing for this step". */
  timingLineA11yLabel?: string;
  /** Forwarded to the grid. */
  gridCopy?: Pick<
    StepDayGridProps,
    "previousMonthLabel" | "nextMonthLabel" | "legendLabel" | "marksA11ySuffix"
  >;
  testID?: string;
}
```

## Copy strings, verbatim

Transcribed from the issue bodies and the prototype. **Curly quotes and the fullwidth
plus are intentional — copy them exactly.**

| Where                                 | String                                                                                                                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unset affordance                      | `＋ when?` (U+FF0B FULLWIDTH PLUS SIGN)                                                                                                                                          |
| Editor question                       | `When do you want this done?`                                                                                                                                                    |
| Editor sub-line                       | `Your intent, not a deadline. A passed date never reads as “late.”` (U+201C / U+201D)                                                                                            |
| Dependency field label                | `Depends on`                                                                                                                                                                     |
| Dependency empty value / clear option | `nothing`                                                                                                                                                                        |
| Footer                                | `Clear` · `Done`                                                                                                                                                                 |
| Grid legend                           | `badges mark days your other steps sit on`                                                                                                                                       |
| Month nav a11y                        | `Previous month` · `Next month`                                                                                                                                                  |
| Ordering note (example from #573)     | `Inspection & labels needs to be done first, and it sits on Jun 30. This one lands before it — that's allowed, it just won't read in order.` (em dash U+2014, apostrophe U+2019) |
| Ordering note (template)              | `{title} needs to be done first, and it sits on {date}. This one lands before it — that's allowed, it just won't read in order.`                                                 |
| Truth line — after                    | `↩ after {title}` (glyph U+21A9)                                                                                                                                                 |
| Truth line — after, completed dep     | `↩ after {title} · done ✓` (U+00B7, U+2713) — **see OQ-1**                                                                                                                       |
| Truth line — due                      | `▦ due {date}` (glyph U+25A6)                                                                                                                                                    |
| Candidate empty state                 | `No other steps in this goal yet.` (new copy — see OQ-4)                                                                                                                         |

**Forbidden strings** (grep test in commit 7): `blocked`, `overdue`, `late` (outside the
sub-line's quoted `“late.”`), `deadline` (outside the sub-line's `not a deadline`),
`missing`, `needed`, `required`, `remaining`.

## Implementation Plan

### Step 1: pure month-grid helpers

**Files**: `src/components/StepDayGrid/monthGrid.ts`,
`src/components/StepDayGrid/__tests__/monthGrid.test.ts`
**Commit**: `feat(native-rd): add pure month-grid date helpers for StepDayGrid (#574)`

- [ ] `toDayKey(date: Date): string` — local `YYYY-MM-DD`, zero-padded. No UTC.
- [ ] `dayKey(y: number, m: number, d: number): string` — the prototype's `iso()`.
- [ ] `leadingBlanks(y, m): number` — `(new Date(y, m, 1).getDay() + 6) % 7`, Monday-first.
- [ ] `daysInMonth(y, m): number` — `new Date(y, m + 1, 0).getDate()`.
- [ ] `shiftMonth({ year, month }, delta): { year, month }` — unbounded, wraps the year.
- [ ] `isPastDay(key: string, nowKey: string): boolean` — strict `key < nowKey` (D3).
- [ ] `groupMarksByDay(marks): Record<string, string[]>` — preserves input order.
- [ ] Tests: `test.each` over a table of months → expected leading blanks, incl. a
      Sunday-1st month (6 blanks) and a Monday-1st month (0); leap-year February;
      December→January and January→December wrap; `isPastDay` at the exact `now`
      boundary (equal → `false`).

### Step 2: `StepDayGrid` component + styles

**Files**: `StepDayGrid.tsx`, `StepDayGrid.styles.ts`, `index.ts`
**Commit**: `feat(native-rd): add StepDayGrid themed month grid (#574)`

- [ ] Month state initialised from `value ?? now`; `useEffect` re-anchors when `value`
      changes to a different month.
- [ ] Header: `‹` / month-year label / `›`. Both nav controls `Pressable`,
      `accessibilityRole="button"`, labelled, `minWidth/minHeight: 44`.
- [ ] Month label from `Intl.DateTimeFormat(locale, { month: "long", year: "numeric" })`,
      memoised on `[locale, year, month]`.
- [ ] Weekday header row from a known Monday + `{ weekday: "narrow" }`, memoised on
      `[locale]`.
- [ ] 7-column layout. Leading blanks are non-interactive `View`s with
      `importantForAccessibility="no-hide-descendants"`.
- [ ] Day cell: `Pressable`, `accessibilityRole="button"`,
      `accessibilityState={{ selected: isSelected }}`, `minHeight: 44`,
      `fontVariant: ["tabular-nums"]`. **Never** `disabled`.
- [ ] `accessibilityLabel` = full date via `Intl.DateTimeFormat(locale, { weekday:
    "long", day: "numeric", month: "long", year: "numeric" })`, plus
      `marksA11ySuffix(count)` when marks exist.
- [ ] `onPress` → `onChange(key === value ? null : key)`.
- [ ] Marks: first two labels as badges, third+ collapses to one overflow badge (`+`).
      Selected day swaps the badge ground (prototype `.day.is-sel .mark`).
- [ ] Legend caption below the grid.
- [ ] Styles: all tokens (`theme.colors.*`, `space`, `radius`, `borderWidth`,
      `fontFamily`, `shadowStyle(theme, "cardElevationSmall")`). Zero hardcoded hex.
- [ ] Doc comment records where a recurrence control would attach (next to the month
      header) and that nothing is built for it.
- [ ] Doc comment records why not `@react-native-community/datetimepicker` (the four
      reasons from #574), so the question is answered in the code, not in review.

### Step 3: `StepDayGrid` stories

**Files**: `StepDayGrid.stories.tsx`
**Commit**: `feat(native-rd): add StepDayGrid stories under Set B & C (#574)`

- [ ] `title: "Set B & C/StepDayGrid"` — establishes the new Storybook section.
- [ ] Pinned `const NOW = new Date(2026, 5, 24)` (the prototype's instant).
- [ ] Stories: `Unset` · `DaySelected` · `PastDaySelected` · `WithMarks` (incl. a
      three-mark day exercising the overflow badge) · `MonthStartingSunday`
      (November 2026) · `AcrossAYearBoundary` (opens on December 2026, with a
      note to tap `›`).
- [ ] `AllThemesMatrix` over `themeNames` with `ScopedTheme` + `MOOD_NAMES`, copying the
      `FocusParkedState.stories.tsx` scaffolding.
- [ ] A `LargeTextDensity` story wrapping the grid in
      `composeTheme("light", "largeText")` — see OQ-2; this is how the issue's
      "confirm at `largeText` density" gets a review surface, since `largeText` is not
      one of the seven registered product themes.
- [ ] `PhoneWidth` wrapper at 344px, matching the sibling stories.

### Step 4: `StepDayGrid` tests

**Files**: `__tests__/StepDayGrid.test.tsx`
**Commit**: `test(native-rd): cover StepDayGrid selection, marks and a11y (#574)`

- [ ] Pinned `now`; assert leading-blank count via testIDs for a Sunday-1st month.
- [ ] `test.each` over boundary days: `now - 1d` past, `now` not past, `now + 1d` not
      past — asserted through the past style flag exposed as a testID suffix or an
      `accessibilityState`, not a colour probe.
- [ ] Tapping an unselected day → `onChange("YYYY-MM-DD")`.
- [ ] Tapping the selected day → `onChange(null)`.
- [ ] Tapping a **past** day still fires `onChange` (the "never refused" contract).
- [ ] No day cell has `accessibilityState.disabled === true`.
- [ ] Month nav: `›` twelve times from June 2026 lands on June 2027 (label assertion).
- [ ] Three marks on one day → two ordinal badges + one overflow badge.
- [ ] a11y label of a marked day includes the marks suffix.
- [ ] `locale="de"` renders a German month name (guards the `Intl` path against a
      regression to a hand-written array).

### Step 5: `StepTimingEditor` component + parts + styles

**Files**: `StepTimingEditor.tsx`, `StepTimingEditor.parts.tsx`,
`StepTimingEditor.styles.ts`, `index.ts`
**Commit**: `feat(native-rd): add StepTimingEditor in-row date + depends-on editor (#573)`

- [ ] Root `View` with a ref, so `onExpand` can hand it to the host (D6).
- [ ] `TimingLine` part: renders the truth lines (`↩ after …`, `▦ due …`), or the single
      `＋ when?`, or nothing when `isCompleted && !hasTiming`. `Pressable`,
      `accessibilityRole="button"`, `accessibilityState={{ expanded }}`,
      `minHeight: 44`.
- [ ] Draft state `{ dueDate, afterStepId }` seeded from `value` on **expand**; reset on
      every expand so a discarded draft never leaks into the next open.
- [ ] `StepDayGrid` embedded, `value={draft.dueDate}`, `onChange` → draft only.
- [ ] `DependencyPicker` part: collapsed button (ordinal badge + title, or the `nothing`
      placeholder, plus a caret), expanding to a `maxHeight` `ScrollView` of options
      (D11). `nothing` first, then candidates; sub-steps indented; completed candidates
      show `✓` in the ordinal slot and the completed title treatment; the current
      selection carries a tick and `accessibilityState={{ selected: true }}`. Every row
      `minHeight: 44`, `accessibilityRole="button"`.
- [ ] Empty `candidates` → `noCandidatesLabel` instead of an empty box.
- [ ] `OrderingNote` part: renders **only** when `draft.dueDate && draft.afterStepId &&
    target.dueDate && draft.dueDate < target.dueDate`. Plain `Text`, body weight,
      `colors.textSecondary`, a quiet left rule. **No** icon, **no** `error`/`danger`
      token, **no** `accessibilityRole="alert"`, **no** `disabled` anywhere.
- [ ] Footer: `Clear` (quiet, fixed width) + `Done` (primary, `flex: 1`), both
      `minHeight: 44`, both labelled.
- [ ] `Done` → `onCommit(draft)` then collapse. `Clear` → `onClear()` then collapse.
      Collapse by tapping the timing line → discard, `onCommit` **not** called.
- [ ] Focus: on expand, `focusAccessibilityRef` onto the editor question `Text`; on
      collapse, `focusAccessibilityRef` back onto the timing line. Store both refs;
      cancel a pending focus on unmount (the util returns a cancel fn).
- [ ] Controlled/uncontrolled expansion per D5.
- [ ] Doc comment records: `afterStepId` stays unvalidated — no cycle detection, no
      same-goal check, no disabled candidates — citing `updateStep`
      (`src/db/queries.ts:893-897`) and the read side's graceful degradation
      (`resolveStepDependencyBand`, `src/db/queries.ts:547-568`). Guards inform; they
      never refuse.
- [ ] Doc comment records that `waiting on` is deliberately absent from this surface and
      moves to Focus (#573), so a future reader does not "restore" it.

### Step 6: `StepTimingEditor` stories

**Files**: `StepTimingEditor.stories.tsx`
**Commit**: `feat(native-rd): add StepTimingEditor stories under Set B & C (#573)`

- [ ] `title: "Set B & C/StepTimingEditor"`, pinned `NOW = new Date(2026, 5, 24)`,
      fixtures transcribed from the prototype's `initialSteps()` (Rewire the workshop:
      "Plan layout & buy materials", "Wire the circuits", "Inspection & labels" +
      3 sub-steps, "Mount the panels", "Final walkthrough").
- [ ] Stories, one per acceptance bullet: `Unset` · `DateOnly` · `DependencyOnly` ·
      `Both` · `PastDate` · `EditingAnExistingPair` (opens expanded) ·
      `OrderingNoteVisible` (the prototype's `conflict` demo: step 4 depends on
      "Inspection & labels" (Jun 30) with its own day set to Jun 26) ·
      `NoCandidates` · `CompletedStep` (no `＋ when?`) · `SubStep`.
- [ ] `InsideAScrollingList` — several rows in a `ScrollView`, wiring `onExpand` to
      `measureLayout` + `scrollTo`, and enforcing one-open-at-a-time via the controlled
      `expanded` prop. This is the story that demonstrates the prototype's
      `parkOpenRow()` requirement.
- [ ] `AllThemesMatrix` over all 7 themes, rendering the `Both` + expanded fixture (the
      richest chrome per theme).

### Step 7: `StepTimingEditor` tests, incl. read-out parity

**Files**: `__tests__/StepTimingEditor.test.tsx`, `__tests__/readOutParity.test.tsx`
**Commit**: `test(native-rd): cover StepTimingEditor draft, note and read-out parity (#573)`

- [ ] Timing line: unset non-completed → exactly one `＋ when?`; unset completed → no
      affordance at all; completed with timing → lines shown.
- [ ] Expand flips `accessibilityState.expanded`; collapse flips it back.
- [ ] Draft discard: expand → pick a day → collapse via the timing line → `onCommit` not
      called; re-expand shows the original `value`, not the discarded draft.
- [ ] `Done` → `onCommit` called once with the draft; `Clear` → `onClear` called, editor
      collapses.
- [ ] Per-field clearing: tapping the selected day again clears the draft date; choosing
      `nothing` clears the draft dependency — both without `Clear`.
- [ ] Candidate list: excludes the editing step; includes sub-steps; marks the selection;
      renders a completed candidate as completed; empty list → `noCandidatesLabel`.
- [ ] Ordering note: `test.each` over (draft date, dependency date) pairs — before →
      shown, same day → hidden, after → hidden, dependency dateless → hidden, no
      dependency → hidden.
- [ ] Ordering-note neutrality: the rendered note subtree contains no
      `accessibilityRole="alert"` and no element with `disabled`/`accessibilityState.disabled`.
- [ ] Forbidden-copy grep test over the rendered tree **and** the source files:
      `/blocked|overdue|missing|needed/i` → zero matches (with the two documented
      exceptions for `late`/`deadline` inside the sub-line).
- [ ] a11y: every day cell, candidate row, nav control and footer button reports
      `accessibilityRole` + a non-empty `accessibilityLabel` (or accessible text) and a
      style with `minHeight >= 44`.
- [ ] **Read-out parity** (`readOutParity.test.tsx`): render `TimelineStep` with
      `afterStep` / `dueDate` and render `StepTimingEditor` with the equivalent props;
      assert the `after` line and the `due` line strings are identical. Drive both from
      the same `formatDate(iso, "en-US")` output so a formatter change breaks the test
      rather than the app.

## Testing Strategy

- [ ] Jest 30 + `@testing-library/react-native` v13, `renderWithProviders` from
      `src/__tests__/test-utils`.
- [ ] Tests co-located at `src/components/<Name>/__tests__/<Name>.test.tsx` — the
      dominant convention for components in this repo (`TimelineStep`,
      `FocusCurrentTaskCard`, `EvidenceTypePicker`), notwithstanding CLAUDE.md's
      `src/__tests__/` mirroring line, which the shared/util tests follow.
- [ ] `test.each` for the leading-blank table, the past/future boundary table, and the
      ordering-note truth table.
- [ ] Every test pins `now` to `new Date(2026, 5, 24)` — never `new Date()`.
- [ ] Run with `bun run test --testPathPatterns "StepDayGrid|StepTimingEditor|monthGrid"`.
- [ ] Manual: `bun run storybook:web`, walk both story sets, then
      `AllThemesMatrix` in all 7 themes and the `LargeTextDensity` story; confirm no day
      cell or candidate row collapses below 44pt and the digit columns do not jitter.
- [ ] Manual: on device/sim, VoiceOver through one expand→pick→Done cycle, confirming
      focus lands in the editor on expand and returns to the timing line on collapse.

## Not in Scope

| Item                                                              | Reason                                                              | Follow-up                                                                   |
| ----------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Screen wiring, `updateStep` writes                                | #573/#574 are Storybook-only                                        | #576                                                                        |
| `YYYY-MM-DD` → local-midnight `DateIso` conversion                | #574 leaves it to the caller deliberately                           | #576                                                                        |
| The row itself (drag, title, evidence chip)                       | #573 owns the timing line, not the row                              | #575 (needs rescoping — it still says "two chips")                          |
| `waiting on` authoring (`waitingOnLabel` / `waitingOnExpectedAt`) | An external wait is recorded mid-ride, in Focus, not while planning | Needs its own issue under #570 before #576 can claim the band is authorable |
| `listRecentWaitingOnLabels()` / waiting-on suggestion chips       | Nothing queries distinct labels; the old chips were a demo fixture  | Owned by whichever issue picks up the wait                                  |
| Recurrence UI                                                     | #574 explicitly: note where it attaches, build nothing              | none                                                                        |
| OS picker as a "jump to a far-off month" affordance               | #574: "Build nothing for that now"                                  | none                                                                        |
| Cycle detection / same-goal validation on `afterStepId`           | Guards inform, never refuse (ADR-0010/0012)                         | none — this is a permanent decision                                         |
| i18n resource keys                                                | D7 — copy is caller-supplied with English defaults                  | #576                                                                        |
| Expand/collapse animation                                         | D9 — needs `animationPref` threaded as a prop                       | Follow-up issue; note in the component doc comment                          |
| Rebasing onto PR #582 (`AnimatedSheet` lift)                      | No sheet in this design                                             | none                                                                        |

## Open Questions

**OQ-1 — `· done ✓` has no shipped precedent, and its data is unsourced. (Blocking-ish.)**
#573 says the row's set state shows "the truth-lines **exactly as Focus and Timeline
render them** — `↩ after <title> · done ✓`". Focus and Timeline render **no such
suffix**. `focusMode:currentTask.metadata.after` and
`timelineJourney:step.metadata.after` are both plain `"after {{title}}"`, and
`FocusCurrentTaskCard.parts.tsx:118-121` carries an explicit comment:

> _"No completion suffix: `afterStep` carries only the prerequisite's title, not its
> done-state, so a hard-coded '✓ done' would assert a fact the props can't back. Real
> dependency-completion data is still unsourced."_

`resolveStepDependencyBand` returns `afterStepTitle` only — no completion flag. So
"read-out parity" and "`· done ✓`" are mutually exclusive as written.

**Assumption taken** (state it in the PR body): the editor accepts an
`afterStepIsCompleted` prop and renders the suffix when it is `true`, defaulting to
`false` so the default render is byte-identical to Focus/Timeline. The parity test
asserts the **suffix-free** form. If the reviewer wants the suffix shipped as the
canonical read-out, that is a change to Focus, Timeline and the resolver — a separate
issue, not this PR.

**OQ-2 — `largeText` is not one of the seven product themes.**
#574 lists the variants as `highContrast, dyslexia, largeText, lowVision,
autismFriendly, lowInfo` and asks to "confirm at `largeText` density". But
`productThemeEntries` (`src/themes/compose.ts:303-311`) registers
`light-default, dark-default, light-highContrast, light-dyslexia,
light-autismFriendly, light-lowVision, light-lowInfo` — `largeText` is a composable
`Variant`, not a registered `ThemeName`. `AllThemesMatrix` therefore cannot include it.
**Assumption**: `AllThemesMatrix` covers the seven registered themes (matching every
existing matrix story), and a separate `LargeTextDensity` story uses
`composeTheme("light", "largeText")` — the `TestScreen.tsx:352` precedent — to satisfy
the "confirm at `largeText` density" clause. `light-lowVision` already carries
`size: sizeL`, so the 1.25× scale is covered inside the matrix too.

**OQ-3 — the prototype's date format omits the year; parity requires it.**
The prototype's `fmtDay()` emits `Jun 30`. The shipped read-out uses `formatDate`
(`src/utils/format.ts:15`), which emits `Jun 30, 2026` and has no year-less mode.
**Assumption**: parity wins — the timing line and the ordering note both use
caller-supplied `formatDate(…, i18n.language)` output, so the editor reads
`▦ due Jun 30, 2026` where the prototype reads `▦ due Jun 30`. Flagged because a
reviewer holding the prototype will notice.

**OQ-4 — the candidate empty-state copy is unspecified.**
#573 requires an empty state ("a goal's first step has no candidates") but supplies no
string. **Assumption**: `No other steps in this goal yet.` — declarative, no
`missing`/`needed` framing. Easy to change; it is a prop default.

**OQ-5 — the issue's line references have drifted.**
Both issues cite `src/db/queries.ts:533-544` and `:871-875`. On `main` at `3e76787`,
`resolveStepDependencyBand` is at **`:547-568`** and the `afterStepId` pass-through is
at **`:893-897`**. Cosmetic, but the plan and the code comments use the current numbers.

**OQ-6 — "only one editor open at a time" cannot be enforced by a self-contained
component.** Resolved by D5 (optional controlled `expanded`), but worth calling out: in
the uncontrolled default, N sibling editors can all be open. The `InsideAScrollingList`
story shows the controlled wiring, and #575 must adopt it.

## Discovery Log

<!-- Entries added by the implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-08-13] Research pass. Confirmed: no `AnimatedSheet` / `Modal` / scrim dependency;
  PR #582 is genuinely independent. Confirmed `Set B & C/` is a **new** Storybook
  section — existing titles are `Iteration B/<Area>/<Component>`, `Design System/…`,
  `Badges/…`, `Screens/…`.
