# Theme Refactor Prep Spec

_Auto-generated from the live `--ob-*` cascade (`tokens/tokens.css` + `tokens/themes.css`) compared against the `cur` map in `App Shell.dc.html`. Numbers are computed, not estimated._

Two independent workstreams. **Do them in this order** — token fixes change the values the shell refactor will consume:

1. **Contrast fixes** → upstream, in `packages/design-tokens/src/**`, then rebuild `tokens.css`/`themes.css`.
2. **Divergence fixes** → shell-side, in `App Shell.dc.html` (or rewire it to read `var(--ob-*)` directly).

After (1), rebuild and re-open `Theme Eval.dc.html` — it re-measures the live CSS automatically; confirm the contrast audit is green before starting (2).

---

## At a glance

- Contrast: **3** failing (<3:1), **14** sub-AA (3–4.5:1) cells across 7 themes × 14 pairs.
- Divergence: **43** mismatched, **0** unresolved cells across 7 themes × 17 tokens.

---

## 1 · Contrast failures — token-source fixes (upstream)

Only pairs with at least one sub-4.5:1 cell are listed. `✗` = fails AA (<4.5), `‼` = fails even large-text (<3).

### `primary btn` — `--ob-action-primary-fg` on `--ob-action-primary-bg`

- ✗ **Full Ride** — 3.52:1
- ✗ **Warm** — 4.23:1

### `destructive` — `--ob-action-destructive-fg` on `--ob-action-destructive-bg`

- ✗ **Bold Ink** — 4.31:1
- ✗ **Warm** — 4.26:1
- ✗ **Still** — 3.02:1

### `tab active` — `--ob-chrome-tab-bar-active-fg` on `--ob-chrome-tab-bar-bg`

- ✗ **Still** — 3.94:1

### `tab idle` — `--ob-chrome-tab-bar-fg` on `--ob-chrome-tab-bar-bg`

- ✗ **Still** — 3.21:1

### `success` — `--ob-success-foreground` on `--ob-success`

- ✗ **Full Ride** — 3.61:1
- ‼ **Night** — 1.84:1
- ✗ **Bold Ink** — 4.27:1
- ✗ **Warm** — 3.94:1
- ✗ **Still** — 3.61:1
- ✗ **Clean** — 3.61:1

### `warning` — `--ob-warning-foreground` on `--ob-warning`

- ✗ **Bold Ink** — 3.51:1
- ‼ **Loud** — 2.63:1

### `info` — `--ob-info-foreground` on `--ob-info`

- ‼ **Night** — 2.44:1

### `highlight` — `--ob-highlight-foreground` on `--ob-highlight`

- ✗ **Warm** — 4.42:1

_Action: nudge the offending fg or bg in the theme JSON until the pair clears 4.5:1 (3:1 if the text is always ≥24px/bold), then rebuild._

---

## 2 · Divergence — shell-side fixes

Each shell `cur.*` color vs the real token it mirrors. "Diverges in" lists themes where they differ (with `cur → real` hex). Verdict classifies the fix.

- ✓ `cur.bg` ↔ `--ob-background` — matches in all 7 themes.
- ✓ `cur.surface` ↔ `--ob-surface-card-bg` — matches in all 7 themes.
### `cur.surfaceAlt` ↔ `--ob-surface-sunken-bg` — **Transcription**

Diverges in 3/7:
- Full Ride: `#f3f3f3` → `#f0f0f0`
- Still: `#eeeeee` → `#f0f0f0`
- Clean: `#f5f5f5` → `#f0f0f0`

### `cur.ink` ↔ `--ob-foreground` — **Transcription**

Diverges in 1/7:
- Full Ride: `#0a0a0a` → `#262626`

### `cur.inkSoft` ↔ `--ob-text-secondary` — **Transcription**

Diverges in 3/7:
- Full Ride: `#525252` → `#737373`
- Still: `#555555` → `#737373`
- Clean: `#444444` → `#737373`

### `cur.muted` ↔ `--ob-muted-foreground` — **Transcription**

Diverges in 5/7:
- Full Ride: `#9a9a9a` → `#737373`
- Bold Ink: `#2a2a2a` → `#000000`
- Warm: `#7a755f` → `#555555`
- Still: `#777777` → `#666666`
- Clean: `#666666` → `#444444`

### `cur.band` ↔ `--ob-chrome-tab-bar-bg` — **Mapping decision**

Diverges in 4/7:
- Night: `#2a1d4e` → `#c4b5fd`
- Bold Ink: `#000000` → `#606060`
- Loud: `#003d99` → `#555555`
- Clean: `#222222` → `#666666`

> shell paints the *header* with this, but `--ob-chrome-tab-bar-bg` is the bottom **tab bar**. Decide what the header should read (top-bar yellow vs `--ob-chrome-header-*`).

### `cur.bandInk` ↔ `--ob-chrome-tab-bar-active-fg` — **Transcription**

Diverges in 2/7:
- Night: `#fafafa` → `#0a0a0a`
- Warm: `#f8f5e4` → `#ffffff`

### `cur.status` ↔ `--ob-chrome-top-bar-bg` — **Transcription**

Diverges in 1/7:
- Warm: `#f5e6a0` → `#f8f5e4`

- ✓ `cur.statusInk` ↔ `--ob-chrome-top-bar-fg` — matches in all 7 themes.
### `cur.primary` ↔ `--ob-action-primary-bg` — **Transcription**

Diverges in 1/7:
- Full Ride: `#2563eb` → `#3b82f6`

> shell uses the *dark* blue `#2563eb`; real `--ob-action-primary-bg` is `#3b82f6`.

### `cur.primaryFg` ↔ `--ob-action-primary-fg` — **Transcription**

Diverges in 4/7:
- Full Ride: `#ffffff` → `#fafafa`
- Night: `#0a1f1a` → `#0a0a0a`
- Warm: `#ffffff` → `#fafafa`
- Loud: `#ffffff` → `#fafafa`

### `cur.accent` ↔ `--ob-accent` — **Mapping decision**

Diverges in 7/7:
- Full Ride: `#a78bfa` → `#f5f5f5`
- Night: `#c4b5fd` → `#3a2d5c`
- Bold Ink: `#000000` → `#f5f5f5`
- Warm: `#8860a0` → `#f5f5f5`
- Still: `#8a7a9a` → `#f5f5f5`
- Loud: `#003d99` → `#f5f5f5`
- Clean: `#222222` → `#f0f0f0`

> `--ob-accent` is a neutral **gray surface**, not brand purple. The shell conflated "accent" with the purple brand color (which lives in `--ob-color-accent-purple` / tab bar). Re-point or drop.

### `cur.accentFg` ↔ `--ob-accent-foreground` — **Transcription**

Diverges in 7/7:
- Full Ride: `#0a0a0a` → `#262626`
- Night: `#1a1033` → `#fafafa`
- Bold Ink: `#ffffff` → `#262626`
- Warm: `#ffffff` → `#262626`
- Still: `#ffffff` → `#262626`
- Loud: `#ffffff` → `#262626`
- Clean: `#ffffff` → `#222222`

### `cur.borderCol` ↔ `--ob-border-default` — **Transcription**

Diverges in 2/7:
- Full Ride: `#0a0a0a` → `#262626`
- Night: `#4e3f73` → `#cfc7e0`

### `cur.check` ↔ `--ob-action-selection-bg` — **Transcription**

Diverges in 2/7:
- Full Ride: `#7c5cff` → `#3b82f6`
- Bold Ink: `#0055cc` → `#000000`

> shell uses purple `#7c5cff`; real `--ob-action-selection-bg` is primary blue.

### `cur.sel` ↔ `--ob-ring` — **Transcription**

Diverges in 1/7:
- Full Ride: `#7c5cff` → `#3b82f6`

> shell uses purple `#7c5cff`; real `--ob-ring` is primary blue.


### Non-color divergences (not in matrix)

- **`cur.headFont` ↔ `--ob-font-headline`** — themes never override `--ob-font-headline` (stays `Anybody` everywhere), but the shell swaps the *headline* font to Lexend / Atkinson / Arial per theme. Decide: keep Anybody headlines (match tokens) or treat headline-swap as intended shell behavior. Affects Warm, Still, Loud, Clean.
- **`cur.bodyFont` ↔ `--ob-font-family`** — matches (Lexend/Atkinson/Arial body swaps are real).
- **`cur.cardShadow` ↔ `--ob-shadow-md`** — shell hardcodes a hard offset shadow; real `--ob-shadow-md` is `none` in every theme. Night Ride additionally defines `--ob-shadow-lg: 0 6px 0 0 rgba(0,0,0,1)` for FABs/modals that the shell drops entirely. Reconcile against `sm`/`md`/`lg`.
- **Destructive** — shell hardcodes red `#dc2626` with no `cur` key; real `--ob-action-destructive-bg` is **amber** (`--ob-color-warning`). Product decision: adopt amber, or add a true destructive token upstream.

---

## 3 · PR checklist

**PR A — token source (`packages/design-tokens`)**
- [ ] Fix each contrast pair listed in §1 (edit theme JSON, rebuild Style Dictionary).
- [ ] Decide on a true `destructive` token vs amber-by-design.
- [ ] Rebuild `tokens.css` + `themes.css`; copy into this project; re-open `Theme Eval.dc.html`; confirm §1 is all green.

**PR B — shell refactor (`App Shell.dc.html`)**
- [ ] Replace the hand-typed `THEMES` `cur` map with direct `var(--ob-*)` reads (eliminates transcription drift permanently), OR correct every `Transcription`-verdict value in §2.
- [ ] Resolve the two `Mapping decision` rows (`accent`, header/`band`) — pick the correct token.
- [ ] Decide headline-font policy (§2 non-color) and shadow reconciliation.
- [ ] Re-run `Theme Eval.dc.html`; confirm the divergence matrix is all `·`.
