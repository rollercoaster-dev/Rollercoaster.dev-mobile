import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
  },
  backIcon: {
    fontSize: 18,
    fontWeight: theme.fontWeight.bold,
  },
  spacer: {
    width: theme.space[12],
  },
  content: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
    overflow: "hidden",
    borderRadius: theme.radius.md,
    margin: theme.space[4],
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    padding: theme.space[4],
    justifyContent: "center",
    alignItems: "center",
    gap: theme.space[4],
  },
  permissionText: {
    textAlign: "center",
    color: theme.colors.textSecondary,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.space[4],
    paddingHorizontal: theme.space[4],
    gap: theme.space[6],
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.backgroundSecondary,
  },
  recordButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.error,
  },
  recordingButtonInner: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.error,
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  timer: {
    textAlign: "center",
    color: theme.colors.error,
    paddingVertical: theme.space[2],
  },
  timerRecording: {
    fontWeight: theme.fontWeight.bold,
  },
  previewContainer: {
    flex: 1,
    margin: theme.space[4],
    borderRadius: theme.radius.md,
    overflow: "hidden",
    backgroundColor: theme.colors.backgroundTertiary,
  },
  previewVideo: {
    flex: 1,
  },
  previewControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: theme.space[4],
    gap: theme.space[3],
  },
  previewButton: {
    flex: 1,
  },
  maxDurationWarning: {
    textAlign: "center",
    color: theme.colors.warning,
    paddingBottom: theme.space[1],
    fontSize: theme.size.xs,
  },
}));
