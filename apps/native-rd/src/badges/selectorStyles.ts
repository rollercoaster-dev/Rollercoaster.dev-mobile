import { StyleSheet } from "react-native-unistyles";

export const selectorStyles = StyleSheet.create((theme) => ({
  // Applied to the horizontal ScrollView itself (never its content container).
  // Every selector rail lives inside a CollapsibleSection, whose content is
  // inset by `space[4]`; with that inset on the *scroll viewport* the last
  // reachable option is clipped against a hard gutter and the rail reads as
  // truncated rather than scrollable. Cancelling the inset here makes the
  // viewport span the card, while `row` below restores the same inset as
  // content padding — so cells still start/end flush with the section title,
  // but scroll all the way to the border. Keep this in sync with
  // CollapsibleSection.styles `content.paddingHorizontal`.
  rail: {
    marginHorizontal: -theme.space[4],
  },
  row: {
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
  },
  label: {
    fontSize: 11,
    fontFamily: theme.fontFamily.body,
  },
  cell: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.space[2],
    paddingVertical: theme.space[2],
    minWidth: 72,
    height: 88,
    borderRadius: 0,
    gap: theme.space[1],
  },
}));
