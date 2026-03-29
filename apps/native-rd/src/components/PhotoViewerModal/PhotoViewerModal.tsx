import React, { useEffect, useState } from "react";
import { View, Modal, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../Text";
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
  const [imageError, setImageError] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setImageError(false);
  }, [uri]);

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
              accessibilityLabel="Close photo viewer"
              hitSlop={16}
            >
              <Text style={styles.closeText}>{"\u2715"}</Text>
            </Pressable>
          </View>
          <View style={styles.imageContainer}>
            {!uri || imageError ? (
              <Text style={styles.errorText}>Failed to load image</Text>
            ) : (
              <Image
                source={{ uri }}
                style={styles.image}
                resizeMode="contain"
                accessibilityLabel={description ?? "Photo evidence"}
                onError={() => setImageError(true)}
              />
            )}
          </View>
          {description ? (
            <View style={styles.captionBar}>
              <Text style={styles.captionText} numberOfLines={2}>
                {description}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
