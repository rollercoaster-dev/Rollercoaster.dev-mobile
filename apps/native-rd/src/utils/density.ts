import type { Space } from "../themes/tokens";
import { Logger } from "../shims/rd-logger";

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

export function narrowDensity(raw: unknown, logger: Logger): DensityLevel {
  if (raw === null || raw === undefined) return "default";
  if (isDensityLevel(raw)) return raw;
  logger.error(new Error(`Unknown density value in DB: ${String(raw)}`), {
    rawDensity: raw,
  });
  return "default";
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
