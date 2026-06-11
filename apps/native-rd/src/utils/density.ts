import type { Space } from "../themes/tokens";

export type DensityLevel = "compact" | "default" | "comfortable";

export const DENSITY_MULTIPLIERS: Record<DensityLevel, number> = {
  compact: 0.75,
  default: 1.0,
  comfortable: 1.25,
} as const;

export const DENSITY_LEVELS: ReadonlySet<DensityLevel> = new Set(
  Object.keys(DENSITY_MULTIPLIERS) as DensityLevel[],
);

export function isDensityLevel(value: unknown): value is DensityLevel {
  return typeof value === "string" && DENSITY_LEVELS.has(value as DensityLevel);
}

/**
 * Result of narrowing an arbitrary DB column value to a DensityLevel.
 *
 * `isUnknown: false` covers both the valid-enum case and the expected-null
 * case (fresh row before settings have ever been written, or a missing
 * column on an old schema). Callers fall back to "default" without alarm.
 *
 * `isUnknown: true` is the corruption case — an unrecognised string or a
 * non-string value. Callers should report `raw` so the operator can trace
 * which migration or write path produced it; the helper itself stays pure.
 */
export type NarrowedDensity =
  | { isUnknown: false; value: DensityLevel }
  | { isUnknown: true; value: "default"; raw: unknown };

export function narrowDensity(raw: unknown): NarrowedDensity {
  if (raw === null || raw === undefined)
    return { isUnknown: false, value: "default" };
  if (isDensityLevel(raw)) return { isUnknown: false, value: raw };
  return { isUnknown: true, value: "default", raw };
}

/**
 * Display strings live in `settings:density.options.<id>` — consumers look them
 * up via `t("settings:density.options.<id>.label")` and `.description`.
 */
export const densityOptions: readonly { id: DensityLevel }[] = [
  { id: "compact" },
  { id: "default" },
  { id: "comfortable" },
];

export function getDensityMultiplier(level: DensityLevel): number {
  return DENSITY_MULTIPLIERS[level];
}

export function applyDensity(baseValue: number, level: DensityLevel): number {
  return Math.round(baseValue * DENSITY_MULTIPLIERS[level]);
}

export function scaleSpacing(space: Space, level: DensityLevel): Space {
  const multiplier = DENSITY_MULTIPLIERS[level];
  if (multiplier === 1) return space;

  const scaled = {} as Record<string, number>;
  for (const [key, value] of Object.entries(space)) {
    scaled[key] = Math.round((value as number) * multiplier);
  }
  return scaled as unknown as Space;
}
