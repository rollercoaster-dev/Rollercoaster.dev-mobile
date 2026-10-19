# UI consistency and design review

Date: 2026-09-24  
Baseline: `56506497`  
Status: Review complete; follow-ups tracked in [epic #683](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/683), not implemented.

The app has a recognizable identity and a useful core interaction model: one current step, visible progress, and evidence leading to a personal badge. The next design pass should make that system more predictable and readable. Its biggest weakness is that polished individual components do not always follow the same rules for typography, actions, accessibility, and leaving unfinished work.

## Scope and evidence

Reviewed the app guidance, current architectural positions, theme composition, navigation, shared controls, and the production implementations of onboarding, goals, creation/editing, focus, timeline, evidence capture/viewing, completion, badges, and settings. Inspected representative current-checkout Storybook previews at 320×568 and 414×896, including goals, Focus Mode, new-goal stages, the badge wall, theme selection, celebration, badge design, the badge-detail hero, and onboarding. Sampled default, dyslexia, low-information, and low-vision themes; this was not an exhaustive theme-by-screen matrix.

Evidence labels below distinguish **source-confirmed behavior**, **visual observation**, and **layout risks requiring native reproduction**. Storybook adds padding and sometimes fixed component frames; its viewport is not an exact native screen. It also emitted `findNodeHandle is not supported on web` from KeyboardAvoidingFrame, and the navigation story did not produce a usable rendered preview during inspection. The native follow-up below supplements these previews with an actual iOS build and journey. Assistive-technology and gesture behavior remain unverified. The native bundle metadata still reads 0.1.17 while package.json declares 0.1.19, but the follow-up rebuilt the native project and bundled JavaScript from this checkout; it did not review the previously installed app.

Validation: `bun run test --runInBand --watchman=false --testPathPatterns '(contrast|accessibility)\.test'` — **2 suites, 257 tests passed**. The first attempt encountered a sandboxed Watchman failure; disabling Watchman allowed the suites to run. Passing these tests supports the tested contracts, not a blanket accessibility claim. No app implementation was changed.

Runtime source currently exposes **seven peer themes**, including dark as one option. Some documentation still describes 14 combinations. This review follows the runtime registry in `src/themes/compose.ts` and `src/hooks/useTheme.ts`.

## What works well

- The cockpit establishes a clear primary action and makes creating another goal visually secondary.
- Focus Mode separates the current task from the complete timeline. This is a good foundation for reducing cognitive load.
- Shared step-state colors and neutral “set aside” language help users understand state without introducing blame.
- Evidence planning is reused between goal creation and editing, avoiding two different models of the same task.
- Theme selection is available during onboarding, with a preview. Settings reuses the same controls.
- Shared buttons generally enforce generous targets; the theme system already centralizes substantial color, spacing, border, and shadow behavior.
- Badge design groups complexity into expandable sections, and sharing groups export choices into one sheet.

## Follow-ups

All findings left unimplemented are tracked here as requested by AGENTS.md. P1 means prioritize before relying on the affected flow; P2 means meaningful usability or consistency improvement; P3 means supporting cleanup. These are review priorities, not an assertion that every item is a release blocker.

### UI-01 · P1 · Make typography preferences work throughout the UI

Tracking: [#684](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/684).

**Source-confirmed; preview also shows typographic inconsistency.** FocusCurrentTaskCard imports native Text directly. Many text styles—including primary/secondary action labels, body text, planned labels, and helper text—omit `fontFamily`, so those elements do not inherit Lexend or Atkinson from adjacent headings. React Native does not inherit a sibling's text style through a View. Meanwhile, theme composition calculates a dyslexia `lineHeightScale`, but `textStyles` uses fixed multipliers instead. Focus titles additionally force 1.05/1.02 line spacing.

There is also a widespread small-text exception: cockpit context and section labels are 10pt; badge metadata is 9–10pt; the badge empty-state body is 13pt; evidence-strip labels are 10pt with a 12pt line height. Literal sizes bypass the app's `sizeL` preference even where OS font scaling remains enabled. This conflicts with the repository's 16pt body / 14pt metadata design guidance.

**Change:** define semantic text styles for screen titles, task titles, body, labels, and metadata, with theme-aware line spacing. Use the shared Text component or explicitly spread those styles. Keep essential goal identity out of tiny uppercase metadata.

**Acceptance:** body and action labels use the selected reading font; dyslexia line spacing changes on multiline text; low-vision sizes affect all essential labels; no required content depends on 9–10pt text. Verify on native with long text and increased OS type size.

Sources: [Focus text styles](../../src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.styles.ts:270), [theme composition](../../src/themes/compose.ts:188), [cockpit typography](../../src/screens/GoalsScreen/GoalsCockpit.styles.ts:30), [badge typography](../../src/screens/BadgesScreen/BadgesWall.styles.ts:162), [viewer labels](../../src/components/ViewerStripThumb/ViewerStripThumb.styles.ts:55).

### UI-02 · P1 · Protect unfinished work consistently

Tracking: [#685](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/685).

**Source-confirmed.** The new-goal wizard keeps the complete plan in local React state until Start Working, but its close handler immediately leaves the screen. A user can enter a title, steps, substeps, and evidence plans and lose all of it with one close. Text-note and link capture also return directly on Back. By contrast, voice capture explicitly confirms discarding a recording through its header-back handler.

“Nothing persisted” is not equivalent to “nothing valuable to lose.” This is especially important for an interruption-friendly product.

**Change:** preserve resumable drafts, or confirm leaving a dirty draft. Apply the same behavior to header close/back, Android back, and native navigation gestures. Keep clean exits immediate.

**Acceptance:** partially written goals and evidence cannot disappear through any navigation exit without a clear choice; returning to a preserved draft restores its content. Do not assume the existing voice-header confirmation already covers native gestures.

Sources: [wizard close](../../src/screens/NewGoalScreen/NewGoalScreen.tsx:85), [text-note back](../../src/screens/CaptureTextNote/CaptureTextNote.tsx:108), [voice confirmation](../../src/screens/VoiceMemoScreen/VoiceMemoScreen.tsx:57).

### UI-03 · P1 · Apply the sheet accessibility contract at every call site

Tracking: [#686](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/686).

**Source-confirmed integration omissions; native impact still needs assistive-technology verification.** The shared AnimatedSheet supports focus restoration, and the new/edit-goal implementations supply it and hide background content on Android. FocusModeScreen opens both capture and planning sheets without a restore-focus reference or hiding its background siblings. BadgeDetailScreen likewise does not hide the hero/body behind the share sheet. Android does not gain isolation from `accessibilityViewIsModal` alone, as the repository's own accessibility guidelines explain.

**Change:** consistently isolate all background controls while a sheet is open and restore focus to the initiating control. Check the parent header and tab navigation too, not only the sheet's immediate siblings.

**Acceptance:** VoiceOver and TalkBack enter the sheet, cannot navigate to background actions while it is open, and return to the correct trigger through every dismissal path. Reuse a screen-level sheet integration pattern rather than duplicating caller obligations.

Sources: [Focus sheets](../../src/screens/FocusModeScreen/FocusModeScreen.tsx:625), [badge share integration](../../src/screens/BadgeDetailScreen/BadgeDetailScreen.tsx:441), [sheet contract](../../src/components/AnimatedSheet/AnimatedSheet.tsx:37).

### UI-04 · P2 · Give a goal with no steps a useful starting state

Tracking: [#687](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/687).

**Source-confirmed.** Quick add can reach the build/ready stages with no steps, and Start Working creates that goal. Focus Mode explicitly returns no body when `stepCount === 0`. The destination therefore lacks a clear task or next action beyond discovering the edit icon.

**Change:** show “Add your first step” as the primary action, with a short explanation. Supporting a goal before it has a plan is reasonable; presenting an empty work area is not helpful.

**Acceptance:** the zero-step creation path lands on a useful empty state; its CTA opens step entry and returns to Focus Mode after the first step is added.

Sources: [blank Focus body](../../src/screens/FocusModeScreen/FocusModeScreen.tsx:133), [wizard persistence](../../src/screens/NewGoalScreen/NewGoalScreen.tsx:123).

### UI-05 · P2 · Make goals identifiable before opening them

Tracking: [#688](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/688).

**Visual observation plus source-confirmed layout.** Keep-warm goals are always two columns, with a corner pin and one-line titles. In the 320pt preview, sample titles collapse to fragments such as “Build ...” and “Unde...”; meaningful differences are lost. The hero's goal name is relegated to a 10pt, single-line overline while the next step receives the headline.

**Change:** prefer a one-column compact list on narrow screens or at large text sizes, allowing two or more title lines. Retain the current-task hierarchy, but give the parent goal a readable label. Keep the pin visually secondary and prevent it from consuming most of the title's width.

**Acceptance:** long, similar goal names remain distinguishable in the home list at 320/375pt and with the low-vision theme. Check normal, spacious, and compact density.

Sources: [fixed columns](../../src/screens/GoalsScreen/GoalsCockpit.styles.ts:67), [title truncation](../../src/screens/GoalsScreen/GoalsCockpit.tsx:266).

### UI-06 · P2 · Make the badge wall usable as a collection

Tracking: [#689](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/689).

**Visual observation and product-design recommendation.** Gallery cells expose names to screen readers but show only artwork or one initial to sighted users. Repeated shapes, colors, or initials are difficult to distinguish. The fixed dark wall also remains dark in reading-oriented themes; low-information mode still presents the same dense, colorful gallery. The dark surface is an intentional documented choice, so changing it requires a product decision rather than treating it as an accidental raw-color bug.

**Change:** provide visible badge names or a labeled list option, especially for low-information/low-vision preferences. Let surrounding gallery chrome honor the reading theme while preserving the user's badge artwork. Consider search once collection size makes scanning difficult; labels should come first.

**Acceptance:** users can locate a named badge without opening each candidate; identical designs and missing designs remain distinguishable; reduced-complexity preferences visibly affect the collection presentation.

Sources: [gallery cell](../../src/components/BadgeWallCell/BadgeWallCell.tsx:32), [fixed wall surface](../../src/screens/BadgesScreen/BadgesWall.styles.ts:37).

### UI-07 · P2 · Label theme choices before selection

Tracking: [#690](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/690).

**Visually confirmed.** Seven swatches are visible, but only the selected theme's name and description appear. A sighted person seeking dyslexia or low-vision support must try colors to discover functionality. Several swatches are visually similar, and names such as “Warm Studio” alone do not identify the benefit. Screen-reader labels are better: they already include the functional description.

**Change:** present each choice with a short visible name and benefit, for example “Warm Studio · Easier reading.” Keep the immediate preview and a clearly marked selection. A wrapping set of labeled tiles or radio rows would be easier to understand than unlabeled circles.

**Acceptance:** a first-time user can identify the appropriate reading/contrast option before changing the UI. Reuse the revised picker in both onboarding and Settings.

Source: [theme swatch rail](../../src/components/ThemeSwatchRail/ThemeSwatchRail.tsx:60).

### UI-08 · P2 · Standardize action styling and press feedback

Tracking: [#691](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/691).

**Source-confirmed and visible in previews.** Shared Button, FocusCurrentTaskCard's custom Pressables, and the badge-wall CTA each implement their own primary-action treatment. Focus uses 54pt minimum height, modal-elevation shadows, and `theme.action` colors; shared Button uses its own size scale, card elevation, and `theme.colors`. Focus action Pressables also use static styles without the shared pressed-state treatment.

**Change:** define one primary/secondary/quiet/destructive action contract, including typography, wrapping, border, elevation, loading, disabled, and pressed states. Extend shared Button for legitimate surface differences rather than recreating the interaction in each feature.

**Acceptance:** an equivalent action has consistent weight and feedback across Goals, Focus, capture, and completion. Long translated labels wrap within the button. Preserve one visually leading action per screen.

Sources: [shared Button styles](../../src/components/Button/Button.styles.ts:7), [Focus custom actions](../../src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.tsx:242).

### UI-09 · P2 · Expose motion control in Settings

Tracking: [#692](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/692).

**Source-confirmed.** The motion hook supports full/reduced/none and respects the OS preference and autism-friendly theme. However, `setAnimationPref` has no production caller. Users cannot choose reduced motion independently of their OS or theme, despite the product's stated user-control principle. This matters for the badge wall's repeating glow as well as transitions and celebrations.

**Change:** add a clearly labeled motion setting with None, Reduced, and Full, showing when the OS or theme overrides it. Keep the strongest accessibility preference authoritative.

**Acceptance:** the preference can be changed without switching theme, persists across launch, and affects all animated surfaces immediately. Verify that switching into a calm theme also updates already-mounted animated views.

Sources: [motion preference](../../src/hooks/useAnimationPref.ts:71), [Settings](../../src/screens/SettingsScreen/SettingsScreen.tsx:166).

### UI-10 · P2 · Give validation a consistent, accessible presentation

Tracking: [#693](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/693).

**Source-confirmed.** Shared Input uses the primary accent for errors and renders the error as ordinary Text without a live announcement or association with the field. Link capture sets that error on Save. Text capture instead disables Save and turns the character counter into a warning after the limit. The user receives different explanations for why similar forms cannot be submitted.

**Change:** define a standard inline error state with explanatory text, an intentional semantic color, and screen-reader announcement/association. For disabled actions caused by invalid input, make the reason visible. Keep error copy specific and calm.

**Acceptance:** entering an invalid link and exceeding the note limit produce a readable, announced explanation; correcting the input clears it; focus moves to the relevant field on failed submission where appropriate. Color must not be the only signal.

Sources: [Input error rendering](../../src/components/Input/Input.tsx:45), [error styling](../../src/components/Input/Input.styles.ts:28), [link validation](../../src/screens/CaptureLinkScreen/CaptureLinkScreen.tsx:47).

### UI-11 · P2 · Bound persistent chrome and action groups on small screens

Tracking: [#694](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/694).

**Source-confirmed geometry; native overflow is a validation risk, not yet a reproduced defect.** Focus renders one pinned footer button per outstanding evidence type, outside the scrolling body. Six planned types can mean at least 324pt of buttons before gaps, helper text, headers, and navigation. Badge detail pins a large celebration hero above its scrollable content and a share action below it; the standalone hero occupies roughly 450pt in the inspected low-vision preview. Celebration's note/body uses a non-scrolling View inside a keyboard-avoiding frame. EvidenceViewer separately hardcodes a 12pt tab allowance rather than using the shared floating-pill clearance.

**Change:** bound footer action count, putting additional evidence choices in a sheet or scrolling region; allow the badge hero to scroll/collapse on constrained heights; make celebration content scroll when needed; use the shared navigation-inset contract in the viewer.

**Acceptance:** on a small native screen with large OS text and the keyboard open, titles, inputs, body content, and actions remain reachable. Exercise all six evidence types, long goal titles, the badge-detail proof body, and the thumbnail strip. Do not shrink text to make the layout fit.

Sources: [Focus footer](../../src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.tsx:108), [pinned badge hero](../../src/screens/BadgeDetailScreen/BadgeDetailScreen.tsx:342), [celebration layout](../../src/components/FinishCelebrateStage/FinishCelebrateStage.tsx:101), [viewer inset](../../src/screens/EvidenceViewerScreen/EvidenceViewerScreen.tsx:17).

### UI-12 · P2 · Keep navigation and secondary actions discoverable

Tracking: [#695](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/695).

**Source-confirmed; design recommendation.** The tab bar displays a text label only for the active destination; inactive destinations are icons. Goal deletion is assigned to long press on cockpit cards, while badge deletion uses a visible overflow menu. Timeline also presents a Back-to-Focus/Badge button inside its header in addition to ScreenSubHeader's back control. These patterns ask users to learn different rules in different areas.

**Change:** show all three tab labels persistently, consolidate duplicate back navigation, and use a consistent visible overflow entry for secondary goal/badge actions. Long press can remain a shortcut. Preserve predictable action placement.

**Acceptance:** users can identify every destination and find goal management without guessing a gesture. Back has one clear visual home and a predictable destination from both Goals and Badges entry paths.

Sources: [inactive tab slots](../../src/navigation/FocusPillTabBar.tsx:206), [goal long press](../../src/screens/GoalsScreen/GoalsCockpit.tsx:177), [timeline actions](../../src/screens/TimelineJourneyScreen/TimelineJourneyScreen.tsx:254).

### UI-13 · P2 · Let users inspect captured evidence where it appears

Tracking: [#696](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/696).

**Source-confirmed; design recommendation.** Focus displays captured evidence as bordered, shadowed pills, but CapturedEvidenceRail is read-only. The timeline and badge proof cards open evidence. Someone who just recorded a note or photo must leave their current task to inspect it even though it appears in front of them.

**Change:** make evidence entries open the shared viewer consistently, with an appropriate accessible role and label. If a specific compact summary must remain noninteractive, style it plainly enough that it does not imply the same behavior as interactive evidence elsewhere.

**Acceptance:** captured evidence can be reviewed from Focus and returned from without losing the current step; the interaction matches Timeline and badge proof entries.

Source: [captured evidence rail](../../src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.parts.tsx:246).

### UI-14 · P3 · Bring design documentation into agreement with runtime

Tracking: [#697](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/697).

**Source-confirmed.** AGENTS/CLAUDE and design/accessibility documents disagree about theme count, font names, and component styling. Examples still show different shadow/border conventions, and accessibility guidance contains both 12- and 14-theme instructions. The current code explicitly exposes seven product themes and uses Lexend for dyslexia. This makes future visual inconsistency more likely even when contributors follow documentation.

**Change:** establish one current component contract and theme inventory; update living guidance and generated examples to match it. Preserve accepted ADR bodies. Add representative composed-screen stories so verification checks the actual shell, not only individually framed parts.

**Acceptance:** documented themes, fonts, action states, and typography agree with runtime; reference previews load their fonts and support the components used to review keyboard/sheet layouts.

Sources: [runtime themes](../../src/hooks/useTheme.ts:14), [design guidance](../../docs/design/design-language.md), [accessibility guidance](../../docs/accessibility-guidelines.md).

### UI-15 · P2 · Count evidence and steps accurately on badge detail

Tracking: [#698](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/698).

**Reproduced on native and source-confirmed.** The completed test goal has three steps and four evidence items (one step has a note and a link). Badge detail correctly says “Evidence: 4 items,” but immediately labels its proof rail “THE PROOF · 4 STEPS.” ProofSpine passes `evidence.length` into a translation that calls the result steps. This makes the earned record contradict the journey the user just completed.

**Change:** call this count evidence items, or group by distinct step before displaying a step count. Use the same terminology in the accessible summary.

**Acceptance:** a three-step goal with four evidence items reports both quantities accurately; multiple items for one step never increase the displayed step count.

Sources: [proof count](../../src/components/ProofSpine/ProofSpine.tsx:56), [translation](../../src/i18n/resources/en/badgeDetail.json:27), [native screenshot](../research/ui-review-2026-09-24/40-badge-detail.png).

### UI-16 · P3 · Pluralize the badge collection title

Tracking: [#699](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/699).

**Reproduced on native and source-confirmed.** Earning the first badge produces the prominent heading “1 badges.” The wall uses a single translation despite passing a count.

**Change:** supply singular/plural translations for supported languages.

**Acceptance:** the first earned badge reads “1 badge”; larger counts use the appropriate plural.

Sources: [English wall copy](../../src/i18n/resources/en/badges.json:4), [native screenshot](../research/ui-review-2026-09-24/43-badge-wall.png).

## Suggested implementation order

1. Protect work and make accessibility behavior dependable: UI-01, UI-02, UI-03, UI-04, UI-10.
2. Verify constrained native layouts and unify action primitives: UI-11 and UI-08.
3. Improve recognition and user control: UI-05, UI-06, UI-07, UI-09, UI-12, UI-13, UI-15, UI-16.
4. Update guidance and composed-screen coverage alongside each change, completing UI-14.

## Native simulator follow-up

Built and launched this checkout on an isolated **iPhone 17 Pro / iOS 26.5** simulator with Xcode 27.0. Built workspace packages first, then ran `CI=1 REACT_NATIVE_PACKAGER_HOSTNAME=localhost npx expo run:ios --no-install --device EF1ACDE1-7B8D-45AE-9380-D36F50C21D60 --port 8081`. The simulator and Metro were left running for inspection.

Device Hub's desktop accessibility interface timed out, so the review used the repository's native Maestro flows, with screenshot-only checkpoints added to temporary copies. Screenshots are actual native renders, not Storybook or mockups. Test data was confined to this newly created simulator.

- **Full journey passed (2m 18s):** welcome, calm-theme onboarding, goal creation, evidence planning, renaming/reordering/reparenting steps, Focus, note and link capture, pause/resume, Timeline, completion, badge design/baking/reveal, detail, share-sheet availability, and badge wall. The export itself was not sent or saved externally.
- **Keyboard CTA regression passed (1m 3s):** creation and editing footer actions navigated successfully while the software keyboard remained open, after adding enough steps to require scrolling.
- **Theme switch passed (16s):** Settings changed from The Full Ride to Night Ride; the native screenshot shows the dark surface, selected swatch, and readable density choices. [Settings screenshot](../research/ui-review-2026-09-24/settings-theme-switch.png).
- Native images confirm the duplicated Timeline back controls (UI-12), competing button treatments (UI-08), and unlabeled theme swatches (UI-07). UI-15 and UI-16 were newly reproduced in the earned-badge experience.
- The note Save action stays visible above the keyboard on this device. Two planned evidence actions, short goal titles, celebration, and the default badge designer fit in the tested calm theme. This does **not** reproduce or dismiss the six-action/small-screen/large-type risks in UI-11.
- Badge detail's large fixed hero uses roughly half the native screen; proof content receives substantially less space, reinforcing the recommendation to validate a scrolling/collapsible hero on compact devices. Horizontal clipping at the edge of proof and shape rails is a scrolling affordance, not by itself proof of inaccessible content.
- The new badge spotlight does display its name. UI-06 applies to the collection grid beneath the spotlight, which was reviewed earlier in populated previews; the single-badge native run is not additional evidence of unlabeled grid cells.

Native test results: [full journey JUnit](../research/ui-review-2026-09-24/full-ride.xml), [keyboard and theme JUnit](../research/ui-review-2026-09-24/secondary.xml). The initial screenshot-instrumented run stopped because Maestro requires relative screenshot paths; correcting the temporary harness allowed the full journey to pass. This was not an app failure.

Selected native screenshots: [welcome](../research/ui-review-2026-09-24/00-welcome.png), [Focus](../research/ui-review-2026-09-24/10-focus-two-types.png), [Timeline](../research/ui-review-2026-09-24/18-timeline.png), [note with keyboard](../research/ui-review-2026-09-24/19-note-keyboard.png), [badge designer](../research/ui-review-2026-09-24/36-design.png), [badge detail](../research/ui-review-2026-09-24/40-badge-detail.png), [badge wall](../research/ui-review-2026-09-24/43-badge-wall.png).

## Remaining native review matrix

Before describing the app as fully visually/accessibility verified, run the complete journey on iOS and Android: welcome → create/edit goal → focus → all evidence types → timeline/viewer → complete/design → badge detail/share → settings. Cover empty, populated, long-content, loading, failure, and interrupted-draft states. Verify all seven runtime themes, the actual density options, normal and accessibility-size OS text, a compact phone, and a larger phone. Check keyboard visibility, back gestures, rotation where supported, safe areas, VoiceOver/TalkBack, sheet isolation, and Reduce Motion. In particular, reproduce UI-11 on native before assigning it a stronger severity.
