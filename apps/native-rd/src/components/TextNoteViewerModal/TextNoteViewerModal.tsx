import React from "react";
import { View, Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text } from "../Text";
import { TextContent } from "../EvidenceContent/TextContent";
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
  const { t } = useTranslation();

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
        <View style={styles.topBar}>
          <Text style={styles.heading}>
            {t("viewerModals.heading.textNote")}
          </Text>
          <Pressable
            onPress={onClose}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t("viewerModals.a11y.closeTextNote")}
            hitSlop={16}
          >
            <Text style={styles.closeText}>{"\u2715"}</Text>
          </Pressable>
        </View>
        <TextContent text={text} createdAt={createdAt} />
      </View>
    </Modal>
  );
}
