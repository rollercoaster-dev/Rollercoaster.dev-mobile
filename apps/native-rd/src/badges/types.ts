/**
 * Badge visual design configuration
 *
 * Stored as JSON on each badge record in the Evolu database.
 * Defines the visual appearance of a badge: shape, frame, color, icon, and text.
 * See docs/vision/badge-designer.md for the full design language.
 */

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
export type BadgeDesign = {
  shape: BadgeShape;
  frame: BadgeFrame;
  color: string; // hex from accent palette
  iconName: string; // Phosphor icon identifier
  iconWeight: BadgeIconWeight;
  title: string; // display title (from goal, editable)
  centerMode: BadgeCenterMode;
  monogram?: string; // 1-3 chars, enforced at UI layer
  bottomLabel?: string; // rendered below the badge; constrained at UI/render layer
  pathText?: string; // top arc inscription
  pathTextPosition?: PathTextPosition; // which arcs to render
  pathTextBottom?: string; // bottom arc inscription
  banner?: BannerData;
  frameParams?: FrameDataParams;
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
 * Uses circle shape, no frame, Trophy icon at regular weight.
 * Falls back to signature purple if no color provided or if color is invalid hex.
 */
export function createDefaultBadgeDesign(
  title: string,
  color?: string | null,
): BadgeDesign {
  const resolvedColor =
    color && isValidHexColor(color) ? color : DEFAULT_DESIGN_COLOR;
  return {
    shape: BadgeShape.circle,
    frame: BadgeFrame.none,
    color: resolvedColor,
    iconName: DEFAULT_ICON_NAME,
    iconWeight: BadgeIconWeight.regular,
    title,
    centerMode: BadgeCenterMode.icon,
  };
}

const CENTER_MODE_VALUES = new Set(Object.values(BadgeCenterMode));

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
    return {
      ...parsed,
      centerMode,
      ...(sanitizedFrameParams !== undefined
        ? { frameParams: sanitizedFrameParams }
        : parsed.frameParams !== undefined
          ? { frameParams: undefined }
          : {}),
    } as BadgeDesign;
  } catch (error) {
    if (__DEV__) {
      console.warn("[parseBadgeDesign] Failed to parse JSON", {
        rawLength: raw.length,
        rawPreview: raw.slice(0, 100),
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}
