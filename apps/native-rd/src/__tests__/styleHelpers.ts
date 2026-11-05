/**
 * Walks up from a queried element to the nearest ancestor whose flattened
 * style sets `key`, and returns that flattened style. Lets layout tests pin a
 * container's style without giving every wrapper View its own testID.
 */
import { StyleSheet } from "react-native";

/** The slice of a queried test instance this helper walks. */
interface StyledNode {
  parent: StyledNode | null;
  props: { style?: unknown };
}

export function closestStyle(
  el: StyledNode,
  key: string,
): Record<string, unknown> {
  let node: StyledNode | null = el.parent;
  while (node) {
    const flat = StyleSheet.flatten(node.props.style as never) as
      | Record<string, unknown>
      | undefined;
    if (flat && key in flat) return flat;
    node = node.parent;
  }
  throw new Error(`No ancestor sets style "${key}"`);
}
