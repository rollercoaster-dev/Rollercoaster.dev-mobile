import React, { useState, useEffect } from "react";
import { View, Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { Text } from "../Text";
import { styles } from "./VideoPlayerModal.styles";

export interface VideoPlayerModalProps {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
}

function PlayerContent({ uri }: { uri: string }) {
  const [error, setError] = useState(false);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    const subscription = player.addListener("statusChange", (payload) => {
      if (payload.status === "error") {
        console.error("[VideoPlayerModal] Playback error", { uri, payload });
        setError(true);
      }
    });
    return () => subscription.remove();
  }, [player]);

  if (error) {
    return <Text style={styles.errorText}>Failed to load video</Text>;
  }

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

export function VideoPlayerModal({
  visible,
  uri,
  onClose,
}: VideoPlayerModalProps) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      supportedOrientations={["portrait", "landscape"]}
      accessibilityViewIsModal
    >
      <View
        style={[
          styles.overlay,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.container}>
          <View style={styles.topBar}>
            <Pressable
              onPress={onClose}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Close video player"
              hitSlop={16}
            >
              <Text style={styles.closeText}>{"✕"}</Text>
            </Pressable>
          </View>
          <View style={styles.videoContainer}>
            {uri ? (
              <PlayerContent uri={uri} />
            ) : (
              <Text style={styles.errorText}>Failed to load video</Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
