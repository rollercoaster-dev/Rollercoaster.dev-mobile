import React from "react";
import { useVideoPlayer, VideoView } from "expo-video";
import { StyleSheet } from "react-native-unistyles";
import { formatDuration } from "../../utils/format";

const styles = StyleSheet.create(() => ({
  video: {
    flex: 1,
  },
}));

export type VideoPreviewProps = {
  uri: string;
  durationSeconds: number;
  /** Short noun describing what the user is previewing, e.g. "Recorded video" or "Selected video". */
  accessibilityNoun: string;
};

export function VideoPreview({
  uri,
  durationSeconds,
  accessibilityNoun,
}: VideoPreviewProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return (
    <VideoView
      player={player}
      style={styles.video}
      fullscreenOptions={{ enable: true }}
      nativeControls
      contentFit="contain"
      accessibilityLabel={`${accessibilityNoun} preview, ${formatDuration(durationSeconds * 1000)} long`}
    />
  );
}
