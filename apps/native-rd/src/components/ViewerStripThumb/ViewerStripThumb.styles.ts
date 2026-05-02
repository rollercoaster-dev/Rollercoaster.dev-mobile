import { StyleSheet } from "react-native-unistyles";
import { palette } from "../../themes/palette";
import type { EvidenceSource } from "../../hooks/useAllEvidenceForGoal";

const THUMB_WIDTH = 76;
const THUMB_HEIGHT = 76;

export const styles = StyleSheet.create((theme) => ({
  container: (isActive: boolean) => ({
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    flexDirection: "column" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: theme.space[1],
    paddingHorizontal: theme.space[1],
    paddingVertical: theme.space[2],
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: isActive ? theme.borderWidth.thick : theme.borderWidth.thin,
    borderColor: isActive ? theme.colors.text : theme.colors.border,
    borderRadius: theme.radius.sm,
    overflow: "hidden",
  }),
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  // Mirrors TimelineNode colors: yellow=goal, blue=step.
  sourceDot: (source: EvidenceSource) => ({
    position: "absolute" as const,
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: source === "goal" ? palette.yellow300 : palette.blue600,
  }),
  icon: {
    fontSize: 22,
  },
  labelWrap: {
    width: "100%",
    alignItems: "center",
  },
  label: {
    fontSize: 10,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    fontFamily: theme.fontFamily.body,
    textAlign: "center" as const,
    lineHeight: 12,
  },
}));

export const VIEWER_STRIP_THUMB_WIDTH = THUMB_WIDTH;
