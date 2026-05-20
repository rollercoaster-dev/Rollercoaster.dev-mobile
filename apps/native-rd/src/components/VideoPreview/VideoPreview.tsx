import React from "react";
import { useVideoPlayer, VideoView } from "expo-video";
import { formatDuration } from "../../utils/format";
import { styles } from "./VideoPreview.styles";

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
