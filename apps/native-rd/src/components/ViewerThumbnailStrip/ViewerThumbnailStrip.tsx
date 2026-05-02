import React, { useCallback, useEffect, useRef } from "react";
import { FlatList, View } from "react-native";
import {
  ViewerStripThumb,
  VIEWER_STRIP_THUMB_WIDTH,
} from "../ViewerStripThumb";
import type { ViewerEvidence } from "../../hooks/useAllEvidenceForGoal";
import { Logger } from "../../shims/rd-logger";
import { styles } from "./ViewerThumbnailStrip.styles";

const logger = new Logger("ViewerThumbnailStrip");

export interface ViewerThumbnailStripProps {
  evidence: ViewerEvidence[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

const THUMB_GAP = 8;
const ITEM_FULL_WIDTH = VIEWER_STRIP_THUMB_WIDTH + THUMB_GAP;

const ThumbSeparator = () => <View style={styles.separator} />;

export function ViewerThumbnailStrip({
  evidence,
  activeIndex,
  onSelect,
}: ViewerThumbnailStripProps) {
  const listRef = useRef<FlatList<ViewerEvidence>>(null);

  useEffect(() => {
    if (activeIndex < 0 || activeIndex >= evidence.length) return;
    // Defer to next tick so FlatList has laid out items before scrollToIndex.
    const id = setTimeout(() => {
      listRef.current?.scrollToIndex({
        index: activeIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }, 0);
    return () => clearTimeout(id);
  }, [activeIndex, evidence.length]);

  const renderItem = useCallback(
    ({ item, index }: { item: ViewerEvidence; index: number }) => (
      <ViewerStripThumb
        evidence={item}
        isActive={index === activeIndex}
        onPress={() => onSelect(index)}
      />
    ),
    [activeIndex, onSelect],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<ViewerEvidence> | null | undefined, index: number) => ({
      length: VIEWER_STRIP_THUMB_WIDTH,
      offset: ITEM_FULL_WIDTH * index,
      index,
    }),
    [],
  );

  const keyExtractor = useCallback((item: ViewerEvidence) => item.id, []);

  if (evidence.length <= 1) return null;

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={evidence}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={ThumbSeparator}
        getItemLayout={getItemLayout}
        // scrollToIndex throws on virtualized items; fall back to offset.
        // Frequent firings indicate getItemLayout has drifted from real width.
        onScrollToIndexFailed={(info) => {
          logger.warn("scrollToIndex failed; falling back to offset", info);
          listRef.current?.scrollToOffset({
            offset: ITEM_FULL_WIDTH * info.index,
            animated: true,
          });
        }}
        accessibilityRole="tablist"
        accessibilityLabel="Evidence items"
      />
    </View>
  );
}
