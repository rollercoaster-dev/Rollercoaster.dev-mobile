# Store Listing & Tester Copy — Drafts

**Date:** 2026-05-15
**Status:** Drafts for Joe to edit before pasting into App Store Connect / Play Console.
**Voice source:** `landing/docs/BRAND_LANGUAGE.md` v1.2, `landing/docs/APP_COPY.md` v3.

---

## 1. What to test / release notes (per build)

**Used in:**

- TestFlight → "What to Test" (4000 char limit — plenty of room)
- Play Console → release notes (500 chars per locale — tighter constraint)

Drafted to fit the 500-char Play Console limit so the same text works on both stores.

```
First build. Most things work. Some don't yet.

What's here:
- Set a goal. Break it into steps.
- Attach evidence — photo, video, voice memo, note, link, or file.
- Design your own badge when a goal is done.
- Task view: one next step per goal, always one screen away.
- 7 themes in light or dark — high-contrast, dyslexia, large text, low-vision, autism-friendly, low-info, standard.
- Works offline. Nothing leaves your phone.

Tell me what crashes, what feels wrong, and what's missing.

— Joe
```

**Character count:** ~485 / 500.

---

## 2. App description

### 2a. Short description (Android only, 80 char limit)

```
A goal tracker for brains like mine. Local-first. No streaks. No nags.
```

**Character count:** 70 / 80.

### 2b. Apple App Store fields

iOS doesn't have a "short description" — it has:

- **Subtitle** (30 chars max) — appears under the app name in the App Store.
- **Promotional Text** (170 chars) — editable any time without resubmission.

**Subtitle candidates** (pick one):

| Option                            | Chars         |
| --------------------------------- | ------------- |
| `Goals at your own pace.`         | 23            |
| `Goals, your own pace.`           | 21            |
| `For brains like mine.`           | 21            |
| `A tracker for non-linear paths.` | 31 — **OVER** |
| `Track goals at your own pace.`   | 29            |

Recommend: `Goals at your own pace.` — declarative, matches refusal-of-streaks framing, no marketing punctuation.

**Promotional text draft** (170 chars max):

```
Local-first goal tracker. No accounts, no streaks, no daily nags. Built by one bipolar + ADHD person for brains that don't move in straight lines.
```

**Character count:** 148 / 170.

### 2c. Full description (Android full description AND Apple App Store description — both 4000 chars)

```
Hi. I built this because I needed it.

Other goal apps made me feel worse, not better. They counted streaks I broke. They asked me to "engage daily." They turned my brain's worst weeks into a number that went down.

I'm bipolar and ADHD. My path doesn't go in a straight line. I wanted something that didn't punish me for that.

So I'm making one. Local-first. No account. No streaks. No daily nags. Yours from the moment you open it.

— Joe


WHAT IT IS

A goal tracker for brains like mine.

You set a goal — something you're working toward. You break it into steps. You do the work in your own time. The app waits.

To mark a step done, you attach something to it — a photo, video, voice memo, note, link, or file. Whatever shows it actually happened. Choosing what to attach makes you stop and notice the work.

When the steps are done, you make a badge for yourself. Everything you attached is baked in. The badge isn't a sticker. It's a record of the work itself.


ONE NEXT STEP. THE SCREEN FOR THIRTY SECONDS.

Most goal apps show you everything at once. For executive dysfunction that's paralysing.

This one inverts it. One screen. One next step per active goal. That's it. The depth is there if you want it — drill into any goal for the full picture.


WHAT THIS APP WON'T DO

- No accounts. No signup. No email needed.
- No streaks. No "you've been away X days" guilt.
- No daily nags. No notifications you didn't ask for.
- No ads. No upsells.
- No data leaves your phone unless you say so.
- No social feed. No likes. No follower counts.

If you want streaks, gamification, and engagement metrics — this won't be that.


WHAT WORKS TODAY

- Set goals. Break them into steps.
- Six ways to attach evidence — photo, video, voice memo, note, link, file.
- Task view — one next step per goal.
- Designed for non-linear paths. Pause for weeks if you need to. Your work is still there.
- 7 themes in light or dark: standard, high-contrast, dyslexia-friendly, large text, low-vision, autism-friendly, low-info.
- Badge designer with shape, colour, icon, frame generators, and curved text.
- Earned-badge view with all your evidence in order.
- Works fully offline.


WHAT YOU OWN

Local-first. Everything stays on your phone. No server copy. No database. Yours.

Badges use the Open Badges open standard. Signed on your phone with a key only your phone has. Even if this project disappears tomorrow, your badges still work.

Export anything. Leave anytime.

The code is on GitHub.


EARLY. HONEST.

This is in closed testing. Some pieces aren't built yet. You can still use it.

If you're neurodivergent, or have accessibility needs, or just want something that doesn't punish your worst weeks — you're who I built this for.

— Joe
```

**Character count:** ~2900 / 4000.

---

## 3. Tester invitation / welcome message

### 3a. Full email version (no length limit)

For DM'ing or emailing prospective testers directly.

```
Subject: would you test my app?

Hi,

I'm building a goal tracker for neurodivergent brains. It's called rollercoaster.dev. Local-first, no accounts, no streaks, no daily nags. I'm bipolar and ADHD and I built it because the alternatives made me feel worse.

I'm looking for testers for the closed beta. Both iOS (via TestFlight) and Android (via Google Play). Google Play needs 12 people testing for two weeks straight before I can publish, so Android testers especially help me unlock the release.

What testing means: you install it, you use it, you tell me what works and what doesn't. In your own words. On your own schedule. Mostly I want to know — does this feel right for your brain?

If you're in, reply with:
- Device (iOS or Android)
- The email you use for the App Store or Play Store

I'll send the invite.

The app is for neurodivergent people and people with accessibility needs. Self-identification only. No diagnosis, no proof, nothing to qualify for.

Two weeks is a real commitment, especially with ADHD or chronic illness. If you fall off, tell me what got in the way. That helps me too.

— Joe
hello@rollercoaster.dev
```

### 3b. TestFlight Beta App Description (500 char limit)

Shown to testers when they tap the TestFlight invite link before installing.

```
A goal tracker for neurodivergent brains. Local-first, no accounts, no streaks, no daily nags. I'm bipolar and ADHD and I built it because the alternatives made me feel worse.

Use it however suits you. Tell me what works, what doesn't, what's missing. Mostly I want to know — does this feel right for your brain?

If you fall off, tell me what got in the way. That helps me too.

— Joe
```

**Character count:** ~415 / 500.

### 3c. Play Console internal testing tester instructions (no fixed limit, but shorter is better)

Shown in the tester opt-in flow when someone clicks your testing track URL.

```
Thanks for testing rollercoaster.dev.

You're helping me unlock a Google Play release — 12 people for two weeks. After you install:

1. Open the app.
2. Use it however suits you.
3. Email me at hello@rollercoaster.dev with anything you notice — bugs, weirdness, things that feel off, things that work.

Mostly I want to know — does it feel right for your brain?

— Joe
```

---

## Notes for editing

- Lowercase moments are intentional (parentheticals, subject line). Don't auto-capitalise.
- No exclamation points anywhere except real in-app strings like `"One last thing!"` if you use them.
- Em-dashes (`—`) are deliberate. Keep them, don't substitute with hyphens.
- Replace `hello@rollercoaster.dev` if you want to use a different inbox.
- The GitHub line in the full description is intentionally one parenthetical-style mention, not a flag-wave. Keep it understated.
- If you want to swap the bipolar+ADHD line for something less personally-identifying in the public store description, the alternative voice move is to keep it identity-first but third-person: `The maker is bipolar and ADHD.` — slightly more arms-length but still named-maker. The first-person version is stronger.
