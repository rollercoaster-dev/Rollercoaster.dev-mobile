/**
 * Keeps a ScrollView pinned to its end while the user is already there.
 *
 * Built for the step lists whose add-step input is the LAST thing in the
 * scroll content, under a footer that a KeyboardAvoidingFrame lifts above the
 * keyboard. Two things move that input out of view without the user
 * scrolling: the viewport shrinks as the keyboard rises, and the content grows
 * as each Enter appends a row. UIKit keeps `contentOffset` through both, so the
 * add row slides under the keyboard and the user has to drag it back.
 *
 * The rule is the chat-list one: if the viewport was showing the end before a
 * change, keep showing the end after it. Shrinks re-pin without animation so
 * the offset tracks the keyboard frame; growth animates so a new row visibly
 * arrives. When the user has scrolled up to read, nothing here moves them.
 *
 * `scrollToEnd()` is exposed for the add input's onFocus, so tapping it from
 * mid-list brings the row to the bottom edge before the keyboard rises.
 */
import { useCallback, useRef } from "react";
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from "react-native";

/** Sub-pixel rounding at the end of a scroll shouldn't read as "not at end". */
const END_TOLERANCE = 1;

export function useStickToScrollEnd() {
  const ref = useRef<ScrollView | null>(null);
  const metrics = useRef({ offsetY: 0, viewportHeight: 0, contentHeight: 0 });

  const isAtEnd = () => {
    const m = metrics.current;
    return m.offsetY + m.viewportHeight >= m.contentHeight - END_TOLERANCE;
  };

  const scrollToEnd = useCallback((animated = true) => {
    ref.current?.scrollToEnd({ animated });
  }, []);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      metrics.current.offsetY = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const height = event.nativeEvent.layout.height;
      const wasAtEnd = isAtEnd();
      const shrank = height < metrics.current.viewportHeight;
      metrics.current.viewportHeight = height;
      if (shrank && wasAtEnd) scrollToEnd(false);
    },
    [scrollToEnd],
  );

  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      // The first report is the mounted list's size, not growth. Without this
      // baseline a long list would open scrolled to its end (0 → N reads as
      // "grew while the empty content fit the viewport").
      if (metrics.current.contentHeight === 0) {
        metrics.current.contentHeight = height;
        return;
      }
      const wasAtEnd = isAtEnd();
      const grew = height > metrics.current.contentHeight;
      metrics.current.contentHeight = height;
      if (grew && wasAtEnd) scrollToEnd(true);
    },
    [scrollToEnd],
  );

  return { ref, onScroll, onLayout, onContentSizeChange, scrollToEnd };
}
