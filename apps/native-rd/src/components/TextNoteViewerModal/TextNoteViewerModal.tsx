import React from "react";
import { View, Modal, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../Text";
import { styles } from "./TextNoteViewerModal.styles";

export interface TextNoteViewerModalProps {
  visible: boolean;
  text: string | null;
  createdAt?: string;
  onClose: () => void;
}

export function TextNoteViewerModal({
  visible,
  text,
  createdAt,
  onClose,
}: TextNoteViewerModalProps) {
  const insets = useSafeAreaInsets();

  if (!text) return null;

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
            <Text style={styles.heading}>Text Note</Text>
            <Pressable
              onPress={onClose}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Close text note viewer"
              hitSlop={16}
            >
              <Text style={styles.closeText}>{"\u2715"}</Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.noteText} accessibilityRole="text">
              {text}
            </Text>
          </ScrollView>
          {createdAt ? (
            <View style={styles.footer}>
              <Text style={styles.timestampText}>{createdAt}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
