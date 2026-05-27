import React from "react";
import { View, Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text } from "../Text";
import { AudioContent } from "../EvidenceContent/AudioContent";
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
  const { t } = useTranslation();

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
        <View style={styles.topBar}>
          <Text style={styles.heading}>Voice Memo</Text>
          <Pressable
            onPress={onClose}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t("viewerModals.a11y.closeAudio")}
            hitSlop={16}
          >
            <Text style={styles.closeText}>{"\u2715"}</Text>
          </Pressable>
        </View>
        <AudioContent uri={uri} durationMs={durationMs} />
      </View>
    </Modal>
  );
}
