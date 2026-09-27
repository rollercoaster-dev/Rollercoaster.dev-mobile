import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text } from "../Text";
import { styles } from "./FullTitleButton.styles";

/** A visible way to read a title whose compact preview may be ellipsized. */
export function FullTitleButton({
  title,
  testID,
  kind = "title",
  onDark = false,
}: {
  title: string;
  testID: string;
  kind?: "title" | "goal" | "step" | "evidence";
  onDark?: boolean;
}) {
  const { t } = useTranslation(["common"]);
  const insets = useSafeAreaInsets();
  // Hold the title the reader opened, even if sync or selection changes its prop.
  const [openedTitle, setOpenedTitle] = useState<string | null>(null);
  const label = t(`common:fullTitle.read.${kind}`);

  return (
    <>
      <Pressable
        onPress={() => setOpenedTitle(title)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={title}
        testID={testID}
        style={styles.trigger}
      >
        <Text
          variant="label"
          style={[styles.triggerText, onDark && styles.triggerTextOnDark]}
        >
          {label}
        </Text>
      </Pressable>
      <Modal
        visible={openedTitle !== null}
        animationType="slide"
        onRequestClose={() => setOpenedTitle(null)}
        accessibilityViewIsModal
      >
        <View
          style={[
            styles.modal,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text
              variant="label"
              style={styles.modalHeading}
              accessibilityRole="header"
            >
              {t("common:fullTitle.heading")}
            </Text>
            <Pressable
              onPress={() => setOpenedTitle(null)}
              accessibilityRole="button"
              accessibilityLabel={t("common:actions.close")}
              testID={`${testID}-close`}
              style={styles.close}
            >
              <Text variant="label" style={styles.triggerText}>
                {t("common:actions.close")}
              </Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.titleContent}>
            <Text variant="title" selectable testID={`${testID}-full-title`}>
              {openedTitle}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
