import React from "react";
import { View, Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../Text";
import { VideoContent } from "../EvidenceContent/VideoContent";
import { styles } from "./VideoPlayerModal.styles";

export interface VideoPlayerModalProps {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
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
        <View style={styles.topBar}>
          <Pressable
            onPress={onClose}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Close video player"
            hitSlop={16}
          >
            <Text style={styles.closeText}>{"\u2715"}</Text>
          </Pressable>
        </View>
        <VideoContent uri={uri} />
      </View>
    </Modal>
  );
}
