import { Platform } from "react-native";

/**
 * Shared KeyboardAvoidingView props for screens with text inputs.
 *
 * No vertical offset is needed: every consumer renders ScreenSubHeader as a JS
 * sibling above the KAV (navigators use `headerShown: false`), so the KAV's
 * onLayout already reflects the post-header screen position. Setting a non-zero
 * offset would double-count the header and leave a visible white strip above
 * the keyboard.
 */
export const KEYBOARD_AVOIDING_PROPS = {
  behavior: (Platform.OS === "ios" ? "padding" : "height") as
    | "padding"
    | "height",
  keyboardVerticalOffset: 0,
};
