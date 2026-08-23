# Never commit an assertion that cannot fail

Writing a throwaway assertion mid-development to check a hypothesis is fine. Committing one is not. Before every commit that touches tests, re-read each assertion you added and ask: **what plausible regression makes this fail?** No answer → delete it.

## The shapes to look for

- **Absence of something that exists nowhere.** `expect(queryByText("⏳")).toBeNull()` when no component in the tree renders that glyph. It passes today, it passes after any rewrite, and it passes if the component is deleted.
- **Absence of copy this branch removed.** Asserting a banner's text is gone right after deleting the banner. Nothing can reintroduce that exact string except someone deliberately re-adding it, and the regex drifts on the first reword.
- **Assertions on a mock's own behavior** rather than the code under test.
- **A negative that a positive next to it already covers.** `getByTestId("timing-mark-after")` proves an icon renders; a companion "and it isn't a text glyph" check adds nothing.

## Assert the thing that exists

If the real guarantee is "this renders a Phosphor icon, not a text run", pin the icon by testID. If it's "the editor cannot mount unwired", render it unwired and assert the fallback appears. A test earns its place by failing when the behavior changes.

## Legitimate negatives

Absence assertions are fine when the absent thing is otherwise reachable — a conditional branch that would render it (`queryByTestId("edit-goal-step-clear-s1")` on a row with no timing set), a modal that closes, an element gated by a prop. The test then fails the moment the condition inverts.

## Origin

#576 shipped three: two duplicate "ships no emoji glyph" cases (`EditGoalTimingLine`, `TimingMarkIcon`) querying `↩`/`⏳`/`▦` as text nodes that no longer existed anywhere, and one asserting the absence of an info banner the same branch had deleted. All three were removed in review. They read as coverage while pinning nothing, and cost reviewer attention on every pass.
