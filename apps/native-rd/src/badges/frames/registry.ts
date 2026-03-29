/**
 * Frame generator registry — maps each BadgeFrame to its generator function.
 *
 * Extracted to its own module to avoid circular dependencies between
 * FrameOverlay (consumer) and the barrel index (which re-exports FrameOverlay).
 */
import type { BadgeFrame } from "../types";
import type { FrameGenerator } from "./types";
import { boldBorderGenerator } from "./boldBorder";
import { crossHatchGenerator } from "./crossHatch";
import { guillocheGenerator } from "./guilloche";
import { microprintGenerator } from "./microprint";
import { rosetteGenerator } from "./rosette";

/** Registry mapping each BadgeFrame to its generator */
export const frameRegistry: Record<BadgeFrame, FrameGenerator> = {
  none: () => null,
  boldBorder: boldBorderGenerator,
  guilloche: guillocheGenerator,
  crossHatch: crossHatchGenerator,
  microprint: microprintGenerator,
  rosette: rosetteGenerator,
};
