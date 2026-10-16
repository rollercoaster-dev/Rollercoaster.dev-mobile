import { StyleSheet } from "react-native-unistyles";

export const textStylesheet = StyleSheet.create((theme) => ({
  text: {
    color: theme.colors.text,
    variants: {
      variant: {
        screenTitle: { ...theme.textStyles.screenTitle },
        taskTitle: { ...theme.textStyles.taskTitle },
        display: { ...theme.textStyles.display },
        headline: { ...theme.textStyles.headline },
        title: { ...theme.textStyles.title },
        body: { ...theme.textStyles.body },
        caption: { ...theme.textStyles.caption },
        label: { ...theme.textStyles.label },
        metadata: { ...theme.textStyles.metadata },
        mono: { ...theme.textStyles.mono },
      },
    },
  },
}));
