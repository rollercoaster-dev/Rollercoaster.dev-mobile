# Emoji audit — action/state glyphs in native-rd

Full inventory as of 2026-07-31 (branch `elastic-text`). Scanned every tracked
`.ts`/`.tsx`/`.json` under `apps/native-rd/` and `packages/`, decoding `\u{...}`
and `\uXXXX` escapes so escaped emoji are not missed, then filtered to
`\p{Extended_Pictographic}` minus the typographic set (see Tier D).

**The rule this audit backs:** emoji must never carry an **action** or a **state**.
See `SKILL.md` → "Rule 8: Icons Are Phosphor, Never Emoji".

Why this is not cosmetic: emoji-presentation codepoints get the platform's color
font, so they ignore `color`, ignore the theme, and ignore all 7 accessibility
variants. `⏸` (U+23F8) in a paused timeline node renders as an iOS blue-grey
pill — visible in the Timeline screenshot that opened this audit — instead of the
node's `nodeFgColorsFallback: "text"`. `highContrast` and `autismFriendly` cannot
touch it.

---

## Tier A — Violations: emoji encoding an action or a state

**All three migrated to Phosphor.** Kept here as the worked examples of what the
rule catches and how each was resolved.

| #   | Site                                               | Was     | What it encoded                            | Now                                                       |
| --- | -------------------------------------------------- | ------- | ------------------------------------------ | --------------------------------------------------------- |
| A1  | `src/components/TimelineNode/stepStateColorMap.ts` | `⏸`     | **state** — `paused` step node             | `nodeIcon: Pause`, weight `bold`, `stepStateNodeFg` color |
| A2  | `src/components/AudioPlayer/AudioPlayer.tsx`       | `⏸` `▶` | **action** — play/pause transport control  | `Pause` / `Play`, weight `fill`, `colors.background`      |
| A3  | `src/screens/GoalsScreen/GoalsCockpit.tsx`         | `▶`     | **action** — resume goal (`<Button icon>`) | `Play`, weight `fill`, `colors.background`                |

What made these three different from the accent emoji in Tiers B and C: the glyph
was the **only** thing communicating the action or state. No adjacent word did
the work. A1 was a bare node interior, A2 toggled meaning between two glyphs with
no label, A3 sat beside a "Resume" label but carried the play affordance itself.

How each was resolved:

- **A1** — the screenshot's offender. `StepStateBase` gained a `nodeIcon?: Icon`
  field alongside the existing `nodeGlyph?: string`, and `TimelineNode` renders
  the icon at `stepStateNodeFg(theme, status)` when one is set. `nodeGlyph`
  survives for text-presentation marks: the sibling `completed` state still uses
  `✓`, which honors `color` correctly. So the map now expresses both kinds
  without the caller needing to know which is which. The icon carries
  `testID="timeline-node-state-icon-{status}"` because an SVG cannot be asserted
  with `getByText` the way the glyph could.
- **A2** — the dead `playIcon` text style was deleted; `PLAY_ICON_SIZE = 16`
  preserves the size it set.
- **A3** — the structural fix the audit called for: `Button`'s `icon` prop widened
  from `string` to `ReactNode`. Strings still route to the original `<Text>` run
  (which is what makes `"+"` and `"✓"` callers work untouched, and what avoids the
  Android glyph+font bug documented on the prop); elements render as-is with the
  caller owning size and color, because only the caller knows the variant's
  foreground. Branching on `typeof` rather than truthiness is what keeps a string
  out of the element branch, where a bare `""` would be a text child outside a
  `<Text>`; a separate `length > 0` check skips the run for `icon=""`, which would
  otherwise be an empty `<Text>` still consuming the pressable's `gap`.

Coverage: `TimelineNode`, `TimelineStep`, and `TimelineJourneyScreen` tests now
assert the Pause icon by testID **and** that `⏸` is absent, so a regression back
to the emoji fails rather than passing quietly. `Button` gained tests for the
element path and the empty-string guard.

## Tier B — Judgment calls

Neither of these is a Tier A violation — the glyph is not the sole carrier of
meaning. Run them through the decision questions in `SKILL.md` → Rule 8 →
"Deciding: icon or emoji" and they land differently, which is why they are split:

- **B0 (mode indicator)** clears every question. One glyph on screen at a time, a
  visible label beside it, a11y-hidden. Emoji is defensible; migrating is
  optional tidying.
- **B1 (evidence types)** fails question 3 — six of them render side by side in
  lists and thumbnail strips, which is exactly the case where mismatched emoji
  metrics show. Treat B1 as **should migrate**, just not urgently.

### B0 — Mode indicator

`src/components/ModeIndicator/ModeIndicator.tsx:15-18` — `📝` `🎯` `🎉` `📖`
(edit / focus / complete / timeline).

Mode is a state, but the emoji does not encode it: the component always renders
the translated `label` beside the glyph, the glyph is
`accessibilityElementsHidden`, and callers can already replace it via the `icon?:
ImageSourcePropType` prop. So the word communicates the mode and the emoji
decorates it — the same shape as the Tier C banner accents.

Migrating is still the tidier end state (`PencilSimple` / `Target` / `Confetti` /
`BookOpen` — `Target` and `Confetti` are already in
`src/badges/iconRegistry.ts`), and the field being named `emoji:` makes it easy
to find. Do it opportunistically, not as a fix.

### B1 — Evidence type icons

One source-of-truth pair drives most sites:

| Source                                                        | Glyphs                        |
| ------------------------------------------------------------- | ----------------------------- |
| `src/constants/evidenceIcons.ts:5-10` (`EVIDENCE_TYPE_ICONS`) | `📷` `🎬` `📝` `🎤` `🔗` `📎` |
| `src/types/evidence.ts:32-37` (`icon` on the type list)       | `📷` `🎬` `🎤` `📝` `🔗` `📎` |

Consumers and independent duplicates:

| Site                                                              | Glyph                         | Note                                                                                           |
| ----------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/components/EvidenceThumbnail/EvidenceThumbnail.tsx:27-32`    | `📷` `🎤` `📝` `🔗` `📄` `🎬` | **third copy** of the map — diverges from `evidenceIcons.ts` (`file` is `📄` here, `📎` there) |
| `src/components/TimelineEvidenceCard/TimelineEvidenceCard.tsx:43` | `📄`                          | fallback                                                                                       |
| `src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx:747`   | `📄`                          | fallback                                                                                       |
| `src/screens/CaptureFile/CaptureFile.tsx:30-41`                   | `📄` `📕` `🖼` `📊` `📝`      | mime-type → glyph switch                                                                       |
| `src/screens/CaptureLinkScreen/CaptureLinkScreen.tsx:117`         | `🔗`                          | hard-coded                                                                                     |
| `src/screens/VoiceMemoScreen/VoiceMemoScreen.tsx:130`             | `🎙`                          | hard-coded, surrogate-pair escape + `️`                                                         |
| `src/components/EvidenceContent/FileContent.tsx:51`               | `📄`                          | hard-coded                                                                                     |

Suggested Phosphor: `Camera` · `FilmSlate` · `NotePencil` · `Microphone` ·
`LinkSimple` · `Paperclip` / `FileText`. Migrating the two source-of-truth maps
plus deleting the `EvidenceThumbnail` duplicate covers most call sites at once.

## Tier C — Allowed: decoration, celebration, waiting

Confirmed in-scope-of-nothing. Leave as-is. Every one of these is already
`accessibilityElementsHidden` / `importantForAccessibility="no"`, i.e. decoration
by declaration.

| Site                                                                    | Glyph     | Why allowed                     |
| ----------------------------------------------------------------------- | --------- | ------------------------------- |
| `src/components/EditGoalView/EditGoalStepRow.tsx:52`                    | `⏳`      | waiting — explicitly allowed    |
| `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.parts.tsx:93` | `⏳`      | waiting — explicitly allowed    |
| `src/screens/BadgeEarnedModal/BadgeEarnedModal.tsx:104`                 | `🏅`      | celebration moment              |
| `src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx:503,604`     | `🏆` `🎯` | celebration hero decoration     |
| `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.tsx:360`      | `🏆`      | all-complete callout decoration |
| `src/components/NewGoalWizard/NewGoalWizard.tsx:700`                    | `🏆`      | badge-note banner decoration    |
| `src/components/EditGoalView/EditGoalView.tsx:493`                      | `📅`      | dates info-banner decoration    |
| `src/components/FinishCelebrateStage/FinishCelebrateStage.tsx:119`      | `✍️`      | closing-note prompt accent      |
| `src/i18n/resources/{en,de,pseudo}/welcome.json:3`                      | `👋`      | greeting copy, not UI chrome    |

Two borderline calls worth a second look if the rule ever tightens:
`FinishCelebrateStage:119` sits inside a `Pressable` (so it decorates an
affordance), and `EditGoalView:493` / `NewGoalWizard:700` are banner accents that
a Phosphor `CalendarBlank` / `Trophy` would render more consistently.

## Tier D — Not emoji: typographic glyphs (out of scope)

Deliberately excluded from the scan. These are text-presentation codepoints that
honor `color` and theme, so they are legitimate under the design system:

`✓` `✔` `✕` `✗` `★` `☆` `→` `←` `↑` `↓` `↳` `↩` `↻` `⋯` `✦` `◆` `·` `▲` `▼` `●` `○` `■` `□` `↔`

Used at e.g. `stepStateColorMap.ts:101` (`nodeGlyph: "✓"`), `TimelineNode.tsx:81`
(`★`), `Checkbox.tsx:46`, `SettingsDensityRows.tsx:65`, `ThemeSwitcher.tsx:198`,
`StepList.tsx:754,855`, `VideoRecorder.tsx:349`.

**Trap:** `⏸` (U+23F8), `▶` (U+25B6), `⏳` (U+23F3) and `⚙` (U+2699) look like
this set but are `Extended_Pictographic` — platforms give them the color emoji
font. That is why the Timeline pause reads blue-grey while the adjacent `✓`
reads themed green. Do not add them to Tier D.

## Tests and stories that pin emoji

Not violations themselves, but they hard-assert the glyphs above and must move
in the same commit as their Tier A/B source:

Already handled with their Tier A source (listed for the record — these now assert
the icon and the _absence_ of the emoji):

- ~~`TimelineNode.test.tsx`~~, ~~`TimelineStep.test.tsx`~~,
  ~~`TimelineJourneyScreen.test.tsx`~~ — were `⏸`
- ~~`Button.test.tsx`~~ — was `▶`, now `"+"` plus an element-icon case

Still pinned to Tier B/C glyphs:

- `src/components/ModeIndicator/__tests__/ModeIndicator.test.tsx:34` — `📝`
- `src/components/EvidenceThumbnail/__tests__/EvidenceThumbnail.test.tsx:114,131,154,168` — `📷` `🎬` `🎤`
- `src/components/EmptyState/__tests__/EmptyState.test.tsx:13,14,19` — `📦`
- `src/components/NewGoalWizard/__tests__/NewGoalWizard.test.tsx:274,294,305` — `🏆` `📝`
- `src/components/EmptyState/EmptyState.stories.tsx:39` — `🎯`
- `src/components/IconButton/IconButton.stories.tsx:81` — `⚙`
- `src/components/Confetti/Confetti.stories.tsx:30` — `🎉`

Unrelated to UI, ignore: `badges/__tests__/badgeFilename.test.ts:18` and
`badgeStorage.test.ts:133` use `🎉🎉🎉` as filename-sanitizer input, and
`__tests__/eslint-rules/no-raw-jsx-strings.test.ts:34` uses `🏆` as rule fixture.

Note `EmptyState` and `Button` both take `icon` as a **string** prop — that API
shape is what invites emoji. Widening them to `ReactNode` is the structural fix.

---

## Reproducing this scan

`grep` for emoji alone misses the escaped forms (`"\u{1F4F7}"`), which is where
most of Tier B hides. Decode escapes first:

```js
const resolved = line
  .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) =>
    String.fromCodePoint(parseInt(h, 16)),
  )
  .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) =>
    String.fromCharCode(parseInt(h, 16)),
  );
const hits = [...resolved].filter(
  (c) => /\p{Extended_Pictographic}/u.test(c) && !TIER_D.has(c),
);
```

## Follow-up: enforcement

The audit is a snapshot; nothing stops the next `⏸`. The project already has a
local ESLint plugin (`src/eslint-rules/`, wired in `eslint.config.js:26-32`) with
`local/no-raw-jsx-strings` as the closest precedent. A `local/no-emoji-glyphs`
rule flagging `Extended_Pictographic` in JSX text and string literals — with an
allowlist comment for Tiers B and C — would make the rule self-enforcing. Not yet
written.
