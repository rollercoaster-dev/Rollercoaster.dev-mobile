import type { Namespace, TFunction } from "i18next";

import type { EvidenceTypeValue } from "../types/evidence";
import type { ThemeName } from "../themes/compose";
import type { DensityLevel } from "../utils/density";

/**
 * Centralized lookups for the shared label keys this app uses across screens.
 * Every call passes an explicit `{ ns }` so the helpers resolve against the
 * right namespace regardless of which one the caller's `t` is bound to via
 * `useTranslation(...)`. The `NS` generic exists only to satisfy the type
 * checker for callers using the array hook form.
 */

const COMMON_NS = { ns: "common" } as const;
const SETTINGS_NS = { ns: "settings" } as const;

export function evidenceLabel<NS extends Namespace>(
  t: TFunction<NS>,
  type: EvidenceTypeValue,
): string {
  return t(`evidenceTypes.${type}.label`, COMMON_NS);
}

export function evidenceShortLabel<NS extends Namespace>(
  t: TFunction<NS>,
  type: EvidenceTypeValue,
): string {
  return t(`evidenceTypes.${type}.shortLabel`, COMMON_NS);
}

/**
 * Composite screen-reader label for a theme option: "<name>. <description>".
 * Used by both ThemeSwitcher and ThemeChipGrid so the a11y contract stays
 * single-sourced.
 */
export function themeA11yLabel<NS extends Namespace>(
  t: TFunction<NS>,
  id: ThemeName,
): string {
  const label = t(`theme.options.${id}.label`, COMMON_NS);
  const description = t(`theme.options.${id}.description`, COMMON_NS);
  return `${label}. ${description}`;
}

/**
 * Composite screen-reader label for a density option: "<label>. <description>".
 * Mirrors `themeA11yLabel` so the two pickers share one a11y contract — the
 * description is visible copy in the row's `value` slot, which the row's
 * accessible name would otherwise drop. Resolves against `settings`, not
 * `common`, since that is where the density strings live.
 */
export function densityA11yLabel<NS extends Namespace>(
  t: TFunction<NS>,
  id: DensityLevel,
): string {
  const label = t(`density.options.${id}.label`, SETTINGS_NS);
  const description = t(`density.options.${id}.description`, SETTINGS_NS);
  return `${label}. ${description}`;
}
