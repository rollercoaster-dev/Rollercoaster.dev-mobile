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
    padding: theme.space[4],
    justifyContent: "center",
    alignItems: "center",
    gap: theme.space[4],
  },
  timerText: {
    fontSize: 48,
    fontWeight: theme.fontWeight.bold,
    fontVariant: ["tabular-nums"],
    color: theme.colors.text,
    textAlign: "center",
  },
  statusText: {
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.error,
    marginRight: theme.space[2],
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space[4],
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  recordButtonInner: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: theme.colors.background,
  },
  recordButtonIdle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.background,
  },
  recordButtonPressed: {
    opacity: 0.7,
  },
  playbackControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space[4],
  },
  playbackProgress: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    width: "80%",
    marginTop: theme.space[2],
    overflow: "hidden",
  },
  playbackProgressFill: {
    height: "100%",
    backgroundColor: theme.colors.accentPrimary,
    borderRadius: 2,
  },
  saveSection: {
    width: "100%",
    padding: theme.space[4],
    gap: theme.space[3],
  },
  captionInput: {
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.space[3],
    color: theme.colors.text,
    backgroundColor: theme.colors.backgroundSecondary,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: theme.space[3],
  },
  buttonFlex: {
    flex: 1,
  },
  errorCard: {
    width: "100%",
  },
  errorText: {
    color: theme.colors.error,
    textAlign: "center",
    marginBottom: theme.space[2],
  },
  permissionContent: {
    padding: theme.space[4],
    alignItems: "center",
    gap: theme.space[3],
  },
  permissionIcon: {
    fontSize: 48,
  },
  permissionText: {
    textAlign: "center",
    color: theme.colors.textSecondary,
  },
}));
