/**
 * Full-screen custom color picker modal for badge design
 *
 * Wraps `reanimated-color-picker` in a neo-brutalist modal with a Preview
 * row (current vs initial), 2D Panel1 (saturation/brightness), and HueSlider.
 * Cancel/Confirm footer follows the design system Button component.
 *
 * Mounts content only when `visible=true` so initialColor and the live
 * preview reset on every open — same pattern as IconPickerModal.
 */

import React, { useCallback, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";
import { useTranslation } from "react-i18next";
import ColorPicker, {
  HueSlider,
  Panel1,
  Preview,
  type ColorFormatsObject,
} from "reanimated-color-picker";

import { Button } from "../components/Button";
import { HeaderBand } from "../components/ScreenHeader";
import { Logger } from "../shims/rd-logger";
import { getIconComponent } from "./iconRegistry";
import { isValidHexColor } from "./types";
import { styles } from "./ColorPickerModal.styles";

const logger = new Logger("ColorPickerModal");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ColorPickerModalProps {
  visible: boolean;
  initialColor: string;
  onConfirm: (hex: string) => void;
  onClose: () => void;
  /** Optional header title override; defaults to "Choose Color". */
  title?: string;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ColorPickerModal(props: ColorPickerModalProps) {
  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={props.onClose}
      accessibilityViewIsModal
    >
      {props.visible && (
        <SafeAreaProvider>
          <ColorPickerModalContent {...props} />
        </SafeAreaProvider>
      )}
    </Modal>
  );
}

function ColorPickerModalContent({
  initialColor,
  onConfirm,
  onClose,
  title,
  testID = "color-picker-modal",
}: Omit<ColorPickerModalProps, "visible">) {
  const { theme } = useUnistyles();
  const { t } = useTranslation("badgeDesigner");
  const insets = useSafeAreaInsets();
  const resolvedTitle = title ?? t("colorPicker.title");

  // Track the live hex so Confirm can send the latest pick without
  // depending on a worklet-shared value. `onChangeJS` fires on every
  // drag tick; cheap relative to the gesture work happening in the
  // picker itself.
  const [currentColor, setCurrentColor] = useState<string>(initialColor);

  const handleColorChange = useCallback((color: ColorFormatsObject) => {
    // reanimated-color-picker is third-party — defend against the picker
    // emitting a malformed payload rather than corrupting downstream
    // BadgeDesign state. Drop the tick; the previous value stays in place.
    if (!isValidHexColor(color.hex)) {
      logger.warn("ColorPicker emitted invalid hex; ignoring", {
        hex: color.hex,
      });
      return;
    }
    setCurrentColor(color.hex);
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(currentColor);
  }, [onConfirm, currentColor]);

  const XIcon = getIconComponent("X");

  return (
    <View style={styles.modalRoot} testID={testID}>
      <HeaderBand safeAreaTop>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("colorPicker.close")}
          style={styles.closeButton}
        >
          {XIcon ? (
            <XIcon
              size={24}
              color={theme.colors.accentPurpleFg}
              weight="bold"
            />
          ) : (
            <Text style={styles.closeIconFallback}>{"✕"}</Text>
          )}
        </Pressable>
        <Text style={styles.headerTitle} accessibilityRole="header">
          {resolvedTitle}
        </Text>
        <View style={styles.headerSpacer} />
      </HeaderBand>

      <View style={styles.contentArea}>
        <ColorPicker
          value={initialColor}
          onChangeJS={handleColorChange}
          style={styles.pickerContainer}
        >
          <Preview
            style={styles.previewWrapper}
            textStyle={styles.previewText}
          />
          <Panel1 style={styles.panel} />
          <HueSlider style={styles.hueSlider} />
        </ColorPicker>

        <View
          style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}
          accessibilityRole="toolbar"
        >
          <View style={styles.footerButton}>
            <Button
              label={t("colorPicker.cancel")}
              variant="secondary"
              onPress={onClose}
              testID={`${testID}-cancel`}
            />
          </View>
          <View style={styles.footerButton}>
            <Button
              label={t("colorPicker.confirm")}
              variant="primary"
              onPress={handleConfirm}
              testID={`${testID}-confirm`}
              accessibilityHint={t("colorPicker.confirmHint", {
                hex: currentColor,
              })}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
