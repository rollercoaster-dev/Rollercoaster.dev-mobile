// Walks a rendered node's style array (and any nested children) to pick up
// the active-selection ring color. Selectors (Shape/Frame/CenterMode/Banner/
// PathText) all render `borderColor: theme.colors.accentPrimary` on either
// the labelled Pressable itself or its first descendent View — a regression
// to `design.color` would silently break the visual contract that #248
// established (custom badge colors no longer flow into the editor chrome).

type StyleObj = Record<string, unknown>;

function flattenStyles(style: unknown): StyleObj[] {
  if (!style) return [];
  if (Array.isArray(style)) return style.flatMap(flattenStyles);
  if (typeof style === "object") return [style as StyleObj];
  return [];
}

export function findRingBorderColor(node: unknown): string | null {
  function walk(n: unknown): string | null {
    if (!n || typeof n !== "object") return null;
    const candidate = n as {
      props?: { style?: unknown; children?: unknown };
      children?: unknown;
    };
    const styles = flattenStyles(candidate.props?.style);
    for (const s of styles) {
      if (typeof s.borderColor === "string") return s.borderColor;
    }
    const children = candidate.children ?? candidate.props?.children;
    const list = Array.isArray(children)
      ? children
      : children
        ? [children]
        : [];
    for (const c of list) {
      const hit = walk(c);
      if (hit) return hit;
    }
    return null;
  }
  return walk(node);
}
