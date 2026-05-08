import React, { useCallback, useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Text } from "../Text";
import { Logger } from "../../shims/rd-logger";
import { styles } from "./VideoContent.styles";

const logger = new Logger("VideoContent");

export interface VideoContentProps {
  uri: string | null;
}

function PlayerContent({
  uri,
  retryToken,
  onError,
}: {
  uri: string;
  retryToken: number;
  onError: () => void;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    const subscription = player.addListener("statusChange", (payload) => {
      if (payload.status === "error") {
        logger.error("Video playback failed", {
          uri,
          retryToken,
          payload,
        });
        onError();
      }
    });
    return () => subscription.remove();
  }, [player, uri, retryToken, onError]);

  return (
    <VideoView
      player={player}
      style={styles.video}
      fullscreenOptions={{ enable: true }}
      nativeControls
      contentFit="contain"
      accessibilityLabel="Video evidence playback"
    />
  );
}

export function VideoContent({ uri }: VideoContentProps) {
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    setError(false);
  }, [uri]);

  const handleRetry = useCallback(() => {
    setError(false);
    setRetryToken((t) => t + 1);
  }, []);

  const handlePlayerError = useCallback(() => setError(true), []);

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        {!uri ? (
          <Text style={styles.errorText}>Failed to load video</Text>
        ) : error ? (
          <View style={styles.errorBlock}>
            <Text style={styles.errorText}>Failed to load video</Text>
            <Pressable
              onPress={handleRetry}
              accessibilityRole="button"
              accessibilityLabel="Retry loading video"
              style={styles.retryButton}
            >
              <Text style={styles.retryLabel}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <PlayerContent
            // Remount player on retry so a fresh useVideoPlayer is created.
            key={retryToken}
            uri={uri}
            retryToken={retryToken}
            onError={handlePlayerError}
          />
        )}
      </View>
    </View>
  );
}
