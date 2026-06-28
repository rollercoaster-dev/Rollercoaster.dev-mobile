/**
 * Design tokens — re-exported from design-tokens adapter
 */

import {
  space as _space,
  size as _size,
  sizeL as _sizeL,
  radius as _radius,
  zIndex as _zIndex,
  fontWeight as _fontWeight,
  lineHeight as _lineHeight,
  lineHeightL as _lineHeightL,
  borderWidth as _borderWidth,
  letterSpacing as _letterSpacing,
  fontFamily as _fontFamily,
  transition as _transition,
  shadow as _shadow,
  darkShadow as _darkShadow,
  shadowVariants as _shadowVariants,
} from "./adapter";

export const space = _space;
export const size = _size;
export const sizeL = _sizeL;
export const radius = _radius;
export const zIndex = _zIndex;
export const fontWeight = _fontWeight;
export const lineHeight = _lineHeight;
export const lineHeightL = _lineHeightL;
export const borderWidth = _borderWidth;
export const letterSpacing = _letterSpacing;
export const fontFamily = _fontFamily;
export const transition = _transition;

interface ShadowSpec {
  offsetX: number;
  offsetY: number;
  radius: number;
  opacity: number;
}

type SemanticShadowKey =
  | "cardElevation"
  | "cardElevationSmall"
  | "modalElevation";

type BaseShadow = Record<keyof typeof _shadow, ShadowSpec>;
type AppShadow = Record<keyof BaseShadow | SemanticShadowKey, ShadowSpec>;

// Semantic shadow roles are now sourced from design-tokens per theme. Themes
// that opt out of elevation set their hard* tokens to `none`; Night Ride maps
// hard* to its authored lg cutout shadow.
function withSemanticShadows(base: BaseShadow): AppShadow {
  return {
    ...base,
    cardElevation: base.hardMd,
    cardElevationSmall: base.hardSm,
    modalElevation: base.hardLg,
  };
}

export const shadow: AppShadow = withSemanticShadows(_shadow);
export const darkShadow: AppShadow = withSemanticShadows(_darkShadow);
export const shadowVariants = Object.fromEntries(
  Object.entries(_shadowVariants).map(([key, value]) => [
    key,
    withSemanticShadows(value),
  ]),
) as Record<keyof typeof _shadowVariants, AppShadow>;

export type Space = typeof space;
export type Size = typeof size;
export type SizeL = typeof sizeL;
export type Radius = typeof radius;
export type ZIndex = typeof zIndex;
export type FontWeight = typeof fontWeight;
export type LineHeight = typeof lineHeight;
export type LineHeightL = typeof lineHeightL;
export type BorderWidth = typeof borderWidth;
export type LetterSpacing = typeof letterSpacing;
export type FontFamily = typeof fontFamily;
export type Transition = typeof transition;
export type Shadow = typeof shadow;
