/**
 * TimingMarkIcon — the leading mark on a C·B timing line, wherever one renders:
 * Focus's metadata band, an Edit Goal row's read-only line, and the in-row
 * `StepTimingEditor`'s truth lines.
 *
 * All three shipped the marks as text runs — `↩`, `⏳`, `▦` — and all three were
 * wrong in the same two ways. `⏳` (U+23F3) is `Extended_Pictographic`, so it has
 * always been the platform's color emoji: it ignores `color`, and the seven
 * accessibility variants cannot touch it — `highContrast` silently fails its 7:1
 * promise and `autismFriendly` gets the loudest thing on a screen whose whole job
 * is calm. `↩` (U+21A9) was catalogued as a safe typographic glyph, and on iOS it
 * is not: it resolves to the emoji font too, and shipped as a blue-boxed arrow
 * beside a grey `▦`. Three Unicode blocks, three bounding boxes, no shared
 * baseline — Rule 8's "several on screen at once, to be compared" test, failing
 * in production.
 *
 * So the mark is a Phosphor icon, and the tone → icon **and** tone → color maps
 * live here rather than once per surface. Those maps already agreed across all
 * three (after = success, waiting = warning, due = textSecondary); keeping them
 * in one place is what stops them drifting the next time one surface changes.
 *
 * Decorative by declaration: the line's own text says "after …" / "due …", so the
 * mark is hidden from assistive tech and carries a `testID` instead — an SVG
 * cannot be asserted with `getByText` the way a glyph could.
 */
import React from "react";
import { View } from "react-native";
import {
  ArrowUUpLeft,
  CalendarBlank,
  Hourglass,
  type Icon,
} from "phosphor-react-native";
import { useUnistyles } from "react-native-unistyles";
import { styles } from "./TimingMarkIcon.styles";

/** The three C·B marks. `waiting` is authored only in Focus (#573). */
export type TimingMarkTone = "after" | "waiting" | "due";

// `ArrowUUpLeft` keeps the `↩` reading the prototype chose — this step loops
// back to another one. `Hourglass` and `CalendarBlank` say plainly what `⏳` and
// `▦` were reaching for.
const MARK_ICON: Record<TimingMarkTone, Icon> = {
  after: ArrowUUpLeft,
  waiting: Hourglass,
  due: CalendarBlank,
};

export interface TimingMarkIconProps {
  tone: TimingMarkTone;
  /**
   * Defaults to `theme.size.sm`, the size every one of the three lines sets on
   * its text — an icon sized to its own line stays on that line's baseline.
   */
  size?: number;
  testID?: string;
}

export function TimingMarkIcon({ tone, size, testID }: TimingMarkIconProps) {
  const { theme } = useUnistyles();
  const Mark = MARK_ICON[tone];
  const color = {
    after: theme.colors.success,
    // Still the waiting tone once the expected date has passed (#571): the wait
    // is ongoing, and a passed date gets no tone of its own — that would be the
    // urgency ADR-0012 rules out.
    waiting: theme.colors.warning,
    due: theme.colors.textSecondary,
  }[tone];

  return (
    <View
      style={styles.mark}
      accessibilityElementsHidden
      importantForAccessibility="no"
      testID={testID ?? `timing-mark-${tone}`}
    >
      <Mark size={size ?? theme.size.sm} weight="bold" color={color} />
    </View>
  );
}
