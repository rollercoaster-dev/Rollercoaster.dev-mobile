import type { ReactElement } from "react";
import type { BadgeShape, FrameDataParams } from "../types";

/** Configuration passed to every frame generator */
export type FrameGeneratorConfig = {
  shape: BadgeShape;
  size: number;
  inset: number;
  innerInset: number;
  params: FrameDataParams;
  /** Stroke color for frame paths. Defaults to '#000000' when omitted. */
  strokeColor?: string;
};

/** A frame generator takes config and returns SVG elements (or null for no-op frames) */
export type FrameGenerator = (
  config: FrameGeneratorConfig,
) => ReactElement | null;
