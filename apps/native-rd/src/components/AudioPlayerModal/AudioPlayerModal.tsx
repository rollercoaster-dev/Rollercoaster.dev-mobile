import React from "react";
import { View, Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AudioPlayer } from "../AudioPlayer";
import { Text } from "../Text";
import { styles } from "./AudioPlayerModal.styles";

export interface AudioPlayerModalProps {
  visible: boolean;
  uri: string | null;
  durationMs?: number;
  onClose: () => void;
}

export function AudioPlayerModal({
  visible,
  uri,
  durationMs,
  onClose,
}: AudioPlayerModalProps) {
  const insets = useSafeAreaInsets();

  if (!uri) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
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
            <Text style={styles.heading}>Voice Memo</Text>
            <Pressable
              onPress={onClose}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Close audio player"
              hitSlop={16}
            >
              <Text style={styles.closeText}>{"\u2715"}</Text>
            </Pressable>
          </View>
          <View style={styles.playerContainer}>
            <AudioPlayer uri={uri} durationMs={durationMs} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
