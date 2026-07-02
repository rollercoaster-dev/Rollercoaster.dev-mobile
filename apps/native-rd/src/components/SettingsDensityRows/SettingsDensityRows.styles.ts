import { StyleSheet } from "react-native-unistyles";

// SettingsDensityRows composes SettingsSection + SettingsRow and adds no styling
// of its own — all chrome comes from those primitives, and D4 forbids an extra
// wrapper View (it would drop SettingsSection's inter-row dividers). This file
// exists to satisfy the per-component styles-file convention enforced by
// src/__tests__/structure/component-structure.test.ts; add styles here if the
// component ever needs its own layout.
export const styles = StyleSheet.create({});
