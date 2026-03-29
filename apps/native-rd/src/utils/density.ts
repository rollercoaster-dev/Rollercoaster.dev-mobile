import type { Space } from "../themes/tokens";

export type DensityLevel = "compact" | "default" | "comfortable";

export const DENSITY_MULTIPLIERS: Record<DensityLevel, number> = {
  compact: 0.75,
  default: 1.0,
  comfortable: 1.25,
} as const;

export const densityOptions: {
  id: DensityLevel;
  label: string;
  description: string;
}[] = [
  { id: "compact", label: "Compact", description: "Tighter spacing (0.75×)" },
  { id: "default", label: "Default", description: "Standard spacing" },
  {
    id: "comfortable",
    label: "Comfortable",
    description: "Roomier spacing (1.25×)",
  },
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
