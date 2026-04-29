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

type AppShadow = Record<keyof typeof _shadow | SemanticShadowKey, ShadowSpec>;

// Semantic shadow roles. Tier-1 (sits on page) uses cardElevation /
// cardElevationSmall — composed to zero in dark so borders carry depth.
// Tier-2 (lifts off page: modals, sheets, FABs, drag-active items) uses
// modalElevation, which keeps the hard offset in dark via the adapter's
// black shadow color.
const cardEmpty: ShadowSpec = { offsetX: 0, offsetY: 0, radius: 0, opacity: 0 };
export const shadow: AppShadow = {
  ..._shadow,
  cardElevation: _shadow.hardMd,
  cardElevationSmall: _shadow.hardSm,
  modalElevation: _shadow.hardLg,
};
export const darkShadowOverrides: Partial<
  Record<SemanticShadowKey, ShadowSpec>
> = {
  cardElevation: cardEmpty,
  cardElevationSmall: cardEmpty,
};

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
