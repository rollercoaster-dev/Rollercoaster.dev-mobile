import React from "react";
import { View } from "react-native";
import {
  ArrowBendDownRight,
  ArrowBendUpLeft,
  ArrowDown,
  ArrowUp,
} from "phosphor-react-native";
import { IconButton } from "../IconButton";
import { styles } from "./EditGoalView.styles";

interface HierarchyActionRowProps {
  testID: string;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onReparent?: () => void;
  moveUpLabel: string;
  moveDownLabel: string;
  reparentLabel: string;
  moveUpTestID: string;
  moveDownTestID: string;
  reparentTestID: string;
  reparentDirection: "promote" | "demote";
}

/** Explicit hierarchy controls shown when gesture-only interaction is unsafe. */
export function HierarchyActionRow({
  testID,
  onMoveUp,
  onMoveDown,
  onReparent,
  moveUpLabel,
  moveDownLabel,
  reparentLabel,
  moveUpTestID,
  moveDownTestID,
  reparentTestID,
  reparentDirection,
}: HierarchyActionRowProps) {
  if (!onMoveUp && !onMoveDown && !onReparent) return null;

  const reparentIcon =
    reparentDirection === "promote" ? (
      <ArrowBendUpLeft size={18} weight="bold" />
    ) : (
      <ArrowBendDownRight size={18} weight="bold" />
    );

  return (
    <View style={styles.hierarchyActionRow} testID={testID}>
      {onMoveUp && (
        <IconButton
          icon={<ArrowUp size={18} weight="bold" />}
          onPress={onMoveUp}
          size="sm"
          tone="ghost"
          accessibilityLabel={moveUpLabel}
          testID={moveUpTestID}
        />
      )}
      {onMoveDown && (
        <IconButton
          icon={<ArrowDown size={18} weight="bold" />}
          onPress={onMoveDown}
          size="sm"
          tone="ghost"
          accessibilityLabel={moveDownLabel}
          testID={moveDownTestID}
        />
      )}
      {onReparent && (
        <IconButton
          icon={reparentIcon}
          onPress={onReparent}
          size="sm"
          tone="ghost"
          accessibilityLabel={reparentLabel}
          testID={reparentTestID}
        />
      )}
    </View>
  );
}
