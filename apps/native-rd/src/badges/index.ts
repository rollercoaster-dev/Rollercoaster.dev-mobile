export { buildUnsignedCredential, buildDid } from "./credentialBuilder";
export type {
  GoalData,
  EvidenceRow,
  CredentialInput,
} from "./credentialBuilder";

export { bakePNG, unbakePNG, isPNG } from "./png-baking";
export {
  generateBadgeImagePNG,
  DEFAULT_BADGE_COLOR,
} from "./badgeImageGenerator";
export { saveBadgePNG } from "./badgeStorage";
export { BADGE_CANVAS_BACKGROUND } from "./constants";
export { captureBadge } from "./captureBadge";
export type { CaptureBadgeOptions } from "./captureBadge";

export {
  BadgeShape,
  BadgeFrame,
  BadgeIconWeight,
  BadgeCenterMode,
  PathTextPosition,
  BannerPosition,
  createDefaultBadgeDesign,
  isValidHexColor,
  parseBadgeDesign,
} from "./types";
export type { BadgeDesign, FrameDataParams, BannerData } from "./types";

export { computeFrameParams, useFrameParamsForGoal } from "./frames";
export type { ComputeFrameParamsInput } from "./frames";

export { BadgeShapeView, generateShapePath } from "./shapes";
export type { BadgeShapeViewProps } from "./shapes";

export { BadgeRenderer } from "./BadgeRenderer";
export type { BadgeRendererProps } from "./BadgeRenderer";

export { IconPicker } from "./IconPicker";
export type { IconPickerProps } from "./IconPicker";

export { PathTextEditor } from "./PathTextEditor";
export type { PathTextEditorProps } from "./PathTextEditor";

export { BannerEditor } from "./BannerEditor";
export type { BannerEditorProps } from "./BannerEditor";

export {
  getIconComponent,
  getRegisteredIconNames,
  ICON_REGISTRY,
} from "./iconRegistry";

export {
  searchIcons,
  getIconsByCategory,
  getAllCuratedIcons,
  iconNameToLabel,
  POPULAR_ICON_NAMES,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
} from "./iconIndex";
export type { IconCategory, IconEntry } from "./iconIndex";
