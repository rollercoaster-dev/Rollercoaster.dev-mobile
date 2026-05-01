import { useSafeAreaInsets } from "react-native-safe-area-context";
import { space } from "../themes/tokens";
import { PILL_LIFT } from "./FocusPillTabBar";

/**
 * Bottom padding for scrollable content inside the tab navigator. Accounts
 * for the lifted FocusPillTabBar (which sticks ~half its height above the
 * tab bar slot) plus the safe-area inset, so the last item is reachable.
 */
export function useTabScreenContentInset(): { paddingBottom: number } {
  const insets = useSafeAreaInsets();
  return {
    paddingBottom: 2 * PILL_LIFT + insets.bottom + space[4],
  };
}
