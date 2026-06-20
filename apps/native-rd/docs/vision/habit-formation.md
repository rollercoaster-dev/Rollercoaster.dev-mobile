# Habit Formation — the recurring practice

**Date:** 2026-06-20
**Status:** Draft — thinking note, not a committed feature
**Owner:** Joe

---

## Why this exists

This is, honestly, a big part of why the app exists. Tracking goals and earning
badges is the visible loop. The quieter motivation underneath it is: **help a
person who is bad at routine build a routine that improves their life** — without
the guilt, the rabbit-holes, and the all-or-nothing collapse that make ordinary
habit apps fail for neurodivergent people.

The seed case is a real one: a daily mobility-and-strength routine, where the goal
isn't to become a "yoga person" but to give the body a daily reminder that it
moves. No pain, better mobility, more strength — but the part that actually
matters, and the part that's hardest, is **making it a habit at all.**

---

## The honest mechanism

The habit never forms inside the app.

It forms at the toothbrush, at the kettlebell left where you almost trip over it,
at the sticky note on the monitor. By the time someone would open the app to "do
their habit," they've already lost — because opening the app is itself a routine
they don't have yet. **Any habit app that needs you to show up to it is competing
with the very thing it's trying to build.**

So "help people build habits" is not "build a better tracker." It decomposes into
three jobs, and only one of them happens in-app at the moment of action.

### 1. Help design the cue — this is the real feature

Most apps let you set a _time_ ("9am: stretch"). Time-based reminders are the wrong
system for ADHD. The thing that works is an **anchor**: attach the new action to
something already load-bearing in your day.

- After brushing teeth → one hip drill.
- While the coffee brews → 90/90 switches.
- After the work laptop closes → a carry.

The app's job is to walk you through _finding_ that anchor — "what do you already
do every single day without fail?" — and binding the tiny new action to it. This is
a thinking task, not a doing task, which is exactly what a phone is good for. No
other habit app does this part well.

### 2. Make the reward immediate and identity-shaped

"You're 14% toward better mobility" is useless — the payoff is months away, and the
brain we're designing for doesn't wait. What works is reflecting back an identity:
_you showed up; that's two days running; you're becoming someone who does this._

For recovery-shaped users especially, the right register is **"I am a person who
shows up,"** not a score climbing toward a prize. This is where the app's badge
instinct can serve the goal — but only if the badge says _you're consistent_, not
_you're winning_.

### 3. Own the failure moment — this is the whole moat

Everyone can start a habit. The product that actually helps is the one that handles
day 4, when you miss. The rules, borrowed from how this works in practice:

- **Never miss twice.** Missing once is invisible. The only thing the app ever
  nudges on is the second miss.
- **No catch-up, by design.** The app should make "making up for it" _impossible_,
  not merely discouraged. The compensation workout is the failure mode, not the
  recovery.
- **Shrink the ask on restart.** After a miss, the next action becomes "do one
  minute / three reps," then grows back. The unit of progress is "I showed up,"
  not "I completed the set."
- **Zero guilt.** A broken streak is a shrug and a one-tap restart, never a small
  death. Most apps make the broken streak punishing; for the abstinence-violation
  effect, that's actively harmful.

---

## The primitive question

This is the fork worth deciding before any of the above gets built.

**Journeys end. Habits don't.**

The current vision models everything as a journey: steps → completion → badge →
done. A habit's success isn't _completion_ — a daily mobility drill never
"completes." Its success is _recurrence over time, forgivingly measured._ If the
app only knows finish-line goals, habits will always feel bolted on.

So: does native-rd need a first-class **practice** (or ritual) concept, sitting
alongside the journey — something whose progress is "how consistently, how kindly"
rather than "how far along"?

My read: this practice concept may be closer to what the app is _for_ than the
journey-and-badge machinery is. The badges are one expression of the underlying
promise — help me become someone who does the thing. They are not the promise
itself.

---

## How this sits with the rest of the vision

- **Reinforces "the journey is the product."** A practice has no destination at all
  — it's pure journey. It's the strongest possible version of that principle.
- **Extends the task view.** "One next step per active goal" already points here.
  A practice's next step is just "the anchor fired; do the tiny thing."
- **Tension with the skill tree / badge loop.** The sharpest line in the seed
  material is _"track with a stupid checkbox, not an app rabbit-hole."_ The reward
  architecture that makes Iteration C fun is the exact dopamine-spiral that makes
  routine apps fail for this use. A practice mode may need to deliberately run
  _under-gamified_, against the app's default reward loop. That's a real design
  decision, not a detail.

---

## Open questions (story altitude — no schema yet)

- Is "practice" a distinct primitive, or a journey with a recurrence flag and
  different surfacing? (Deliberately not answering with data-model shapes here.)
- What does the _anchor-design_ flow feel like as a screen? This is the one piece
  that genuinely belongs on the phone and is worth prototyping first.
- How does a practice show up in the task view next to finish-line goals without
  the two collapsing into the same "checkbox" feel?
- Where does this land in the A–D iteration strategy — a thread inside B, or its
  own thing?

---

_Draft created 2026-06-20. Seeded from Joe's own mobility/strength routine and the
recurring-habit motivation behind the app. Not a committed feature — input for the
vision and for whenever the Iteration B feature list gets opened._
