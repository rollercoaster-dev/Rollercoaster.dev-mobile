/**
 * Badge visual design configuration
 *
 * Stored as JSON on each badge record in the Evolu database.
 * Defines the visual appearance of a badge: shape, frame, color, icon, and text.
 * See docs/vision/badge-designer.md for the full design language.
 */

import { reportError } from "../services/sentry-report";

/** Available badge background shapes */
export const BadgeShape = {
  circle: "circle",
  shield: "shield",
  hexagon: "hexagon",
  roundedRect: "roundedRect",
  star: "star",
  diamond: "diamond",
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- intentional same-name type+const pattern
export type BadgeShape = (typeof BadgeShape)[keyof typeof BadgeShape];

/** Available badge frame/border styles */
export const BadgeFrame = {
  none: "none",
  boldBorder: "boldBorder",
  guilloche: "guilloche",
  crossHatch: "crossHatch",
  microprint: "microprint",
  rosette: "rosette",
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- intentional same-name type+const pattern
export type BadgeFrame = (typeof BadgeFrame)[keyof typeof BadgeFrame];

/** Phosphor icon weight variants */
export const BadgeIconWeight = {
  thin: "thin",
  light: "light",
  regular: "regular",
  bold: "bold",
  fill: "fill",
  duotone: "duotone",
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- intentional same-name type+const pattern
export type BadgeIconWeight =
  (typeof BadgeIconWeight)[keyof typeof BadgeIconWeight];

/** Badge center display mode: icon (default) or monogram text */
export const BadgeCenterMode = {
  icon: "icon",
  monogram: "monogram",
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- intentional same-name type+const pattern
export type BadgeCenterMode =
  (typeof BadgeCenterMode)[keyof typeof BadgeCenterMode];

/** Position for text rendered along the badge's circular path */
export const PathTextPosition = {
  top: "top",
  bottom: "bottom",
  both: "both",
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- intentional same-name type+const pattern
export type PathTextPosition =
  (typeof PathTextPosition)[keyof typeof PathTextPosition];

/** Position for the banner/ribbon overlay */
export const BannerPosition = {
  top: "top",
  bottom: "bottom",
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- intentional same-name type+const pattern
export type BannerPosition =
  (typeof BannerPosition)[keyof typeof BannerPosition];

/** Data-driven parameters for frame overlay rendering */
export type FrameDataParams = {
  variant: number;
  stepCount: number;
  evidenceCount: number;
  daysToComplete: number;
  evidenceTypes: number;
  stepNames?: string[];
};

/** Banner/ribbon overlay configuration */
export type BannerData = {
  text: string;
  position: BannerPosition;
};

/**
 * Badge visual design configuration.
 *
 * **Path text semantics:**
 * - `pathText` is always the **top arc** inscription.
 * - `pathTextBottom` is always the **bottom arc** inscription.
 * - `pathTextPosition` controls which arcs are **visible**:
 *   `'top'` → only `pathText`, `'bottom'` → only `pathTextBottom`,
 *   `'both'` → both arcs rendered.
 *
 * **Constraint enforcement:**
 * `monogram` (1-3 chars) and `bottomLabel` are constrained
 * at the renderer/UI layer, not here — this type represents stored data.
 */
/**
 * Sentinel string for `borderColor` / `iconColor` meaning "track the active theme".
 *
 * When a saved value equals this sentinel, the renderer resolves it to
 * `theme.colors.border` (border) or the safe text color for `design.color`
 * (icon) at render time. This keeps theme-tracking a first-class saved
 * choice instead of overloading "field absent".
 */
export const BADGE_COLOR_THEME_SENTINEL = "theme" as const;

export type BadgeDesign = {
  shape: BadgeShape;
  frame: BadgeFrame;
  color: string; // hex from accent palette
  iconName: string; // Phosphor icon identifier
  iconWeight: BadgeIconWeight;
  iconDuotoneOpacity?: number;
  title: string; // display title (from goal, editable)
  centerMode: BadgeCenterMode;
  monogram?: string; // 1-3 chars, enforced at UI layer
  bottomLabel?: string; // rendered below the badge; constrained at UI/render layer
  pathText?: string; // top arc inscription
  pathTextPosition?: PathTextPosition; // which arcs to render
  pathTextBottom?: string; // bottom arc inscription
  banner?: BannerData;
  frameParams?: FrameDataParams;
  /**
   * Border color. The designer drops the field when the user picks the
   * theme sentinel; absent → renderer uses `theme.colors.border`. Hex
   * strings are stored as-is. `createDefaultBadgeDesign` returns `'#000000'`
   * so new badges show the intended neo-brutalist black border instead of
   * inheriting the theme.
   */
  borderColor?: typeof BADGE_COLOR_THEME_SENTINEL | string;
  /**
   * Icon / monogram color. Same drop-on-sentinel contract as borderColor.
   * Absent → renderer falls back to `getSafeTextColor(design.color)`.
   */
  iconColor?: typeof BADGE_COLOR_THEME_SENTINEL | string;
  /**
   * Frame ring color. Same drop-on-sentinel contract as borderColor. Absent →
   * renderer falls back to `theme.colors.border`. Only meaningful when
   * `frame !== BadgeFrame.none`; stored values for `BadgeFrame.none` are
   * harmless but ignored at render time.
   */
  frameColor?: typeof BADGE_COLOR_THEME_SENTINEL | string;
};

/** Default icon when none is specified */
const DEFAULT_ICON_NAME = "Trophy";

/** Default badge color (purple — the rollercoaster.dev signature) */
const DEFAULT_DESIGN_COLOR = "#a78bfa";

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** Returns true if `value` is a valid 3/6/8-digit hex color string. */
export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value);
}

/**
 * Create a sensible default BadgeDesign from a goal title and color.
 *
 * Rounded rectangle shape, monogram of the title's first letter — matches the
 * placeholder rendering used in BadgeCard tiles, so the pre-bake preview
 * and the unstyled tile fallback agree.
 *
 * `iconName` / `iconWeight` are populated as harmless defaults; they are
 * not drawn while `centerMode === monogram`, but BadgeDesigner re-uses
 * them if the user toggles `centerMode` back to `icon`.
 */
export function createDefaultBadgeDesign(
  title: string,
  color?: string | null,
): BadgeDesign {
  const resolvedColor =
    color && isValidHexColor(color) ? color : DEFAULT_DESIGN_COLOR;
  const firstLetter = (title.trim().charAt(0) || "?").toUpperCase();
  return {
    shape: BadgeShape.roundedRect,
    frame: BadgeFrame.none,
    color: resolvedColor,
    iconName: DEFAULT_ICON_NAME,
    iconWeight: BadgeIconWeight.regular,
    iconDuotoneOpacity: 0.2,
    title,
    centerMode: BadgeCenterMode.monogram,
    monogram: firstLetter,
    borderColor: "#000000",
  };
}

const CENTER_MODE_VALUES = new Set(Object.values(BadgeCenterMode));

// Sanitize a stored borderColor/iconColor/frameColor: passes through the
// sentinel or a valid hex; everything else falls back. A present-but-invalid
// `raw` is the surprising branch — surface it in dev so silent type drift
// (e.g. a number leaking from a future migration) is visible.
function sanitizeBadgeColorField(
  field: "borderColor" | "iconColor" | "frameColor",
  raw: unknown,
  fallback: typeof BADGE_COLOR_THEME_SENTINEL | undefined,
): typeof BADGE_COLOR_THEME_SENTINEL | string | undefined {
  if (raw === BADGE_COLOR_THEME_SENTINEL) return BADGE_COLOR_THEME_SENTINEL;
  if (typeof raw === "string" && isValidHexColor(raw)) return raw;
  if (raw !== undefined) {
    if (__DEV__) {
      console.warn(`[parseBadgeDesign] Invalid ${field}; falling back`, {
        raw,
        fallback,
      });
    }
    reportError(new Error(`Invalid stored BadgeDesign ${field}`), {
      area: "badge.parse",
      kind: "color-field",
    });
  }
  return fallback;
}

/** Validate and sanitize FrameDataParams, returning undefined if invalid. */
function sanitizeFrameParams(raw: unknown): FrameDataParams | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const fp = raw as Record<string, unknown>;
  const variant =
    typeof fp.variant === "number" && isFinite(fp.variant)
      ? fp.variant
      : undefined;
  if (variant === undefined) return undefined;
  return {
    variant,
    stepCount:
      typeof fp.stepCount === "number" && isFinite(fp.stepCount)
        ? fp.stepCount
        : 0,
    evidenceCount:
      typeof fp.evidenceCount === "number" && isFinite(fp.evidenceCount)
        ? fp.evidenceCount
        : 0,
    daysToComplete:
      typeof fp.daysToComplete === "number" && isFinite(fp.daysToComplete)
        ? fp.daysToComplete
        : 0,
    evidenceTypes:
      typeof fp.evidenceTypes === "number" && isFinite(fp.evidenceTypes)
        ? fp.evidenceTypes
        : 0,
    stepNames: Array.isArray(fp.stepNames)
      ? fp.stepNames.filter((s): s is string => typeof s === "string")
      : undefined,
  };
}

/**
 * Safely parse a BadgeDesign from a raw JSON string (e.g. from the database).
 * Returns null if the input is falsy or not valid JSON.
 * Applies defaults for missing required fields and sanitizes data-driven params.
 */
export function parseBadgeDesign(
  raw: string | null | undefined,
): BadgeDesign | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const centerMode = CENTER_MODE_VALUES.has(
      parsed.centerMode as BadgeCenterMode,
    )
      ? (parsed.centerMode as BadgeCenterMode)
      : BadgeCenterMode.icon;
    const sanitizedFrameParams = sanitizeFrameParams(parsed.frameParams);
    // Missing `borderColor` → 'theme' (existing designs continue to track
    // the active theme). `iconColor` falls back to `undefined` so the
    // renderer's prior auto-contrast path (getSafeTextColor) still kicks in.
    const borderColor = sanitizeBadgeColorField(
      "borderColor",
      parsed.borderColor,
      BADGE_COLOR_THEME_SENTINEL,
    );
    const iconColor = sanitizeBadgeColorField(
      "iconColor",
      parsed.iconColor,
      undefined,
    );
    const frameColor = sanitizeBadgeColorField(
      "frameColor",
      parsed.frameColor,
      undefined,
    );
    const iconDuotoneOpacity =
      typeof parsed.iconDuotoneOpacity === "number" &&
      Number.isFinite(parsed.iconDuotoneOpacity) &&
      parsed.iconDuotoneOpacity >= 0.2 &&
      parsed.iconDuotoneOpacity <= 1
        ? parsed.iconDuotoneOpacity
        : undefined;
    const result: Record<string, unknown> = {
      ...parsed,
      centerMode,
      borderColor,
    };
    // Strip sanitized fields whose result is `undefined` so they don't appear
    // as `key: undefined` properties (which would break `toEqual` round-trip
    // tests and make stored JSON noisier than it needs to be). Also strip the
    // retired `borderScope` field — designs from before per-channel colors
    // may carry it; the renderer no longer reads it.
    if (iconColor === undefined) delete result.iconColor;
    else result.iconColor = iconColor;
    if (frameColor === undefined) delete result.frameColor;
    else result.frameColor = frameColor;
    if (iconDuotoneOpacity === undefined) delete result.iconDuotoneOpacity;
    else result.iconDuotoneOpacity = iconDuotoneOpacity;
    delete result.borderScope;
    if (sanitizedFrameParams === undefined) delete result.frameParams;
    else result.frameParams = sanitizedFrameParams;
    return result as BadgeDesign;
  } catch (error) {
    if (__DEV__) {
      console.warn("[parseBadgeDesign] Failed to parse JSON", {
        rawLength: raw.length,
        rawPreview: raw.slice(0, 100),
        error: error instanceof Error ? error.message : String(error),
      });
    }
    // Prod signal — malformed badge JSON is rare enough to be worth
    // surfacing in Sentry without flooding. rawLength is included as breadcrumb
    // metadata rather than message text to keep redactors happy.
    reportError(error, { area: "badge.parse", kind: "design-json" });
    return null;
  }
}
