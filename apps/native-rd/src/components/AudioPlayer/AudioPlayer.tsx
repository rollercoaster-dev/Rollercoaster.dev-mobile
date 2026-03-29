import React from "react";
import { View, Pressable } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Text } from "../Text";
import { formatDuration } from "../../utils/format";
import { styles } from "./AudioPlayer.styles";

export interface AudioPlayerProps {
  uri: string;
  durationMs?: number;
}

export function AudioPlayer({ uri, durationMs }: AudioPlayerProps) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const isPlaying = status.playing;
  const currentMs = Math.round(status.currentTime * 1000);
  const totalMs = durationMs ?? Math.round(status.duration * 1000);
  const progress = totalMs > 0 ? currentMs / totalMs : 0;

  function handleToggle() {
    try {
      if (isPlaying) {
        player.pause();
      } else {
        if (status.didJustFinish) {
          player.seekTo(0);
        }
        player.play();
      }
    } catch (error) {
      console.error("[AudioPlayer] Playback error", { uri, error });
    }
  }

  return (
    <View style={styles.container} accessible accessibilityLabel="Audio player">
      <Pressable
        onPress={handleToggle}
        accessible
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? "Pause audio" : "Play audio"}
        style={({ pressed }) => [
          styles.playButton,
          pressed && styles.playButtonPressed,
        ]}
      >
        <Text style={styles.playIcon}>{isPlaying ? "\u23F8" : "\u25B6"}</Text>
      </Pressable>

      <View style={styles.progressContainer}>
        <View
          style={styles.progressTrack}
          accessible
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(progress * 100),
          }}
        >
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(progress * 100)}%` },
            ]}
          />
        </View>
      </View>

      <Text
        style={styles.timeText}
        accessibilityLabel={`${formatDuration(currentMs)} of ${formatDuration(totalMs)}`}
        accessibilityLiveRegion="polite"
      >
        {formatDuration(currentMs)}
      </Text>
    </View>
  );
}
