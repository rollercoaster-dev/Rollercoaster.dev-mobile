import { StyleSheet } from "react-native-unistyles";

export const textStylesheet = StyleSheet.create((theme) => ({
  text: {
    color: theme.colors.text,
    variants: {
      variant: {
        display: { ...theme.textStyles.display },
        headline: { ...theme.textStyles.headline },
        title: { ...theme.textStyles.title },
        body: { ...theme.textStyles.body },
        caption: { ...theme.textStyles.caption },
        label: { ...theme.textStyles.label },
        mono: { ...theme.textStyles.mono },
      },
    },
  },
}));
