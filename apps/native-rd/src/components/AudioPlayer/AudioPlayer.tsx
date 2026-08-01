import React from "react";
import { View, Pressable } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useUnistyles } from "react-native-unistyles";
import { useTranslation } from "react-i18next";
import { Pause, Play } from "phosphor-react-native";
import { Text } from "../Text";
import { formatDuration } from "../../utils/format";
import { styles } from "./AudioPlayer.styles";

/** Matches the `fontSize: 16` the play/pause text glyph used before Rule 8. */
const PLAY_ICON_SIZE = 16;

export interface AudioPlayerProps {
  uri: string;
  durationMs?: number;
}

export function AudioPlayer({ uri, durationMs }: AudioPlayerProps) {
  const { t } = useTranslation(["common"]);
  const { theme } = useUnistyles();
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
    <View
      style={styles.container}
      accessible
      accessibilityLabel={t("common:audioPlayer.a11y.container")}
    >
      <Pressable
        onPress={handleToggle}
        accessible
        accessibilityRole="button"
        accessibilityLabel={
          isPlaying
            ? t("common:audioPlayer.a11y.pause")
            : t("common:audioPlayer.a11y.play")
        }
        style={({ pressed }) => [
          styles.playButton,
          pressed && styles.playButtonPressed,
        ]}
      >
        {/* `fill` weight: a transport control reads as a solid play/pause mark,
            not an outline. `colors.background` inverts against the button's
            `accentPrimary` fill \u2014 the same token the replaced text glyph used.
            Rule 8: `\u23F8`/`\u25B6` are emoji-presentation codepoints, so they ignored
            that color and rendered in the platform emoji font instead. */}
        {isPlaying ? (
          <Pause
            size={PLAY_ICON_SIZE}
            weight="fill"
            color={theme.colors.background}
          />
        ) : (
          <Play
            size={PLAY_ICON_SIZE}
            weight="fill"
            color={theme.colors.background}
          />
        )}
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
        accessibilityLabel={t("common:audioPlayer.a11y.progress", {
          current: formatDuration(currentMs),
          total: formatDuration(totalMs),
        })}
        accessibilityLiveRegion="polite"
      >
        {formatDuration(currentMs)}
      </Text>
    </View>
  );
}
