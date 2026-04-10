import { Platform } from "react-native";

/**
 * Shared KeyboardAvoidingView props for screens with text inputs.
 * The 88pt iOS offset accounts for the SafeAreaView top inset + header.
 */
export const KEYBOARD_AVOIDING_PROPS = {
  behavior: (Platform.OS === "ios" ? "padding" : "height") as
    | "padding"
    | "height",
  keyboardVerticalOffset: Platform.OS === "ios" ? 88 : 0,
} as const;
