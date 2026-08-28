# When to ask, and when to just decide

Both halves of this rule come from the same gate, applied in opposite directions. Before surfacing a question, check whether it has any decision content. Before implementing a constrained spec, check whether the constraint leaves the feature able to do its job.

## Don't ask when the default preserves existing behavior

If the planned default keeps the app doing what it does today and the alternative is the _new_ thing, that is not an open question. Take the default, state it in one line, and move on. File the behavior-changing alternative as a follow-up if it's worth having.

The test: does one option simply preserve current behavior? If yes, that's the answer.

## Do ask when the spec can't deliver its own promise

When a plan's own open question is "what if this input can't express what the user wants?", answering "accepted limitation" and building anyway is the wrong call. Raise it before writing code — one line, get a decision, then build.

Test the feature against its own promise before implementing. If the deliverable can't answer the question its own UI asks, it isn't a limitation, it's a broken feature.

Design guardrails are not functional ceilings. A constraint that bans a _vocabulary_ (ADR-0012's ban on judgment language — month grids with today-highlighting, "3 days away", red past dates) is not a constraint that the input may be unable to name a day at all. Read the guardrail for what it forbids, not as a cap on capability.

## Origin

#416: asking whether "Replay welcome" should reset `hasSeenWelcome` had no decision content — view-only was already the status quo. The question read as stalling.

#574: the due-date sheet was scoped to ~5 relative day chips with "no calendar component", so no other day could be named. That was recorded as an accepted limitation, implemented, and then scrapped. The header asked "When do you want this done?" while the UI accepted only five answers.
