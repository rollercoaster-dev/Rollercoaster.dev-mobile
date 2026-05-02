import React from "react";
import { View, Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../Text";
import { PhotoContent } from "../EvidenceContent/PhotoContent";
import { styles } from "./PhotoViewerModal.styles";

export interface PhotoViewerModalProps {
  visible: boolean;
  uri: string | null;
  description?: string;
  onClose: () => void;
}

export function PhotoViewerModal({
  visible,
  uri,
  description,
  onClose,
}: PhotoViewerModalProps) {
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
            accessibilityLabel="Close photo viewer"
            hitSlop={16}
          >
            <Text style={styles.closeText}>{"\u2715"}</Text>
          </Pressable>
        </View>
        <PhotoContent uri={uri} description={description} />
      </View>
    </Modal>
  );
}
