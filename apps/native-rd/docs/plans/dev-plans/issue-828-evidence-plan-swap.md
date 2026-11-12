# Issue #828: Evidence "change" sheet swaps a single planned type

Issue: <https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/828>

## Scope

Focus Mode's "Planned evidence" sheet (opened by "change" in the step's
evidence box). On a step planning only Audio, tapping Note added it, so the
step then needed both. Only the Focus Mode sheet changes behaviour. The chip
grid (`EvidenceTypePicker` authoring mode) is shared with Edit Goal, the New
Goal wizard and the step list; those keep multi-select.

## Decisions

- **D1 (owner may overrule).** The issue listed three options and none was
  chosen. Implemented: when exactly one type is planned, picking another type
  replaces it (a swap). Several types stay possible through an explicit "Ask
  for more than one kind" control. A step that already plans several opens as
  on/off toggles. The sheet's sub-line says what a tap does in each mode.
- **D2.** The mode is fixed when the sheet opens, so a chip never changes role
  while the reader is using it. Turning a two-type plan down to one leaves the
  sheet in on/off mode until it closes.
- **D3.** Swap leaves the sheet open, so the reader sees the change and can
  still close it themselves.
- **D4.** `EvidenceTypePicker` gains `selectionMode` (default `"multiple"`). In
  `"single"` the chips are radios in a radiogroup, so a screen reader announces
  them as a one-of choice with the checked one named.
- **D5.** The chip container was `accessible`, which on iOS makes it a single
  VoiceOver element and hides the chips. Dropped so each chip can announce its
  own state (acceptance criterion 3). This also applies to Edit Goal and the
  wizard; the chips there were already individually labelled, this lets
  VoiceOver reach them.

## Steps

- [x] `selectionMode` on the authoring grid; radio roles and "Switch to …" hint
- [x] Focus Mode: swap in single mode, "Ask for more than one kind", sub-line
- [x] en, de and pseudo strings
- [x] Tests: swap, explicit add, multi opens as toggles, reopen resets, last-type guard, picker roles

## Intent Verification

- [x] A step planning one type changes to another without gaining a second requirement (Jest: `swaps a single planned type for the one picked`)
- [x] The sheet says in plain words what a tap does (sub-line, both modes)
- [x] Each chip announces whether it is on (radio/checkbox `checked`; container no longer hides chips)
- [ ] Checked on a device with VoiceOver/TalkBack (not done: no device available)

## Validation

- `bun run test --testPathPatterns 'FocusModeScreen|EvidenceTypePicker'`
- `bun run type-check`, `bun run lint` (one pre-existing error on main in `EditGoalRowDescription.tsx`, fixed in #826)
- `bun run test`

## Discovery Log

- The sheet itself lives only in `FocusModeScreen.tsx`; the chip grid is shared.
- #826 tutorial step 4 tells readers to "Pick another kind, then tap Audio to
  turn it off". With this change that can become "Pick another kind".

## Follow-ups

- Simplify tutorial step 4 copy in `templates.json` once #826 and this land.
- Device check with VoiceOver and TalkBack of the radio group and the
  announcement after "Ask for more than one kind".
