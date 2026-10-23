/**
 * Type-scaling policy (#741). The one place that decides how far text may
 * grow under OS Dynamic Type, and the thresholds layouts switch on.
 *
 * Caps are combined bounds measured against the default theme's base size:
 * Low Vision's 1.25× token scale counts toward the cap, so its body text
 * reaches the same 2.0× as everyone else's instead of 2.5×. A theme's own
 * scale is never undone: Low Vision headings stay at 1.25×.
 */
import type { TextVariant } from "../components/Text";
import { size } from "../themes/tokens";

/**
 * Max combined growth per text variant. Headings are already large (24–40pt)
 * and don't grow with the OS setting; growing them only breaks words.
 */
export const CAPS: Record<TextVariant, number> = {
  display: 1.0,
  headline: 1.0,
  title: 2.0,
  body: 2.0,
  label: 2.0,
  caption: 2.0,
  mono: 2.0,
};

/** Max combined growth for chrome text: tab labels, pills, counters, overlines. */
export const CHROME_CAP = 1.3;

/** Button labels don't grow: a pinned button must not swallow the screen. */
export const CONTROL_CAP = 1.0;

/** OS font scale at which layouts should treat text as large. */
export const LARGE_TYPE_AT = 1.3;

/** OS font scale at which iOS enters its accessibility sizes (AX1 and up). */
export const ACCESSIBILITY_SIZE_AT = 1.6;

/** A text role: a `Text` variant, chrome, or a control (button label). */
export type TypeRole = TextVariant | "chrome" | "control";

const ROLE_CAPS: Record<TypeRole, number> = {
  ...CAPS,
  chrome: CHROME_CAP,
  control: CONTROL_CAP,
};

/** How much larger the active theme's type scale is than the default's (1.25 for Low Vision). */
export function themeScaleOf(sizeScale: { md: number }): number {
  if (!(sizeScale.md > 0)) return 1;
  return sizeScale.md / size.md;
}

/**
 * The OS multiplier to pass as `maxFontSizeMultiplier` so the combined
 * (theme × OS) size stays within the role's cap. Never below 1: RN ignores
 * values between 0 and 1, which would silently remove the cap, and a
 * non-positive theme scale would turn the cap into Infinity or NaN.
 */
export function capForRole(role: TypeRole, themeScale: number): number {
  if (!(themeScale > 0)) return ROLE_CAPS[role];
  return Math.max(1, ROLE_CAPS[role] / themeScale);
}

/** `capForRole` in `Text`'s terms: the `chrome` prop overrides the variant. */
export function capFor(
  variant: TextVariant,
  chrome: boolean,
  themeScale: number,
): number {
  if (chrome) return capForRole("chrome", themeScale);
  return capForRole(variant, themeScale);
}
