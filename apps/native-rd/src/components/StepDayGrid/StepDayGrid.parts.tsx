import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "../Text";
import { styles } from "./StepDayGrid.styles";

/**
 * One day cell. Split out of `StepDayGrid` to keep both files inside the
 * 300-line budget; it holds no state of its own.
 */
export function DayCell({
  day,
  dayKey: key,
  a11yLabel,
  isSelected,
  isToday,
  isPast,
  marks,
  onPress,
  testID,
}: {
  day: number;
  dayKey: string;
  a11yLabel: string;
  isSelected: boolean;
  isToday: boolean;
  isPast: boolean;
  /** Ordinals of other steps sitting on this day, in list order. */
  marks: readonly string[];
  onPress: () => void;
  testID: string;
}) {
  const visibleMarks = marks.slice(0, 2);
  const hasOverflow = marks.length > 2;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={a11yLabel}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.day,
        isToday && styles.dayToday,
        isSelected && styles.daySelected,
        pressed && !isSelected && styles.dayPressed,
      ]}
    >
      <Text
        style={[
          styles.dayNumber,
          isPast && styles.dayNumberPast,
          isSelected && styles.dayNumberSelected,
        ]}
      >
        {day}
      </Text>

      {marks.length > 0 && (
        <View style={styles.marksRow}>
          {visibleMarks.map((label, index) => (
            <MarkBadge
              key={`${key}-mark-${index}`}
              label={label}
              onSelectedDay={isSelected}
            />
          ))}
          {/* Third and beyond collapse into one badge — the cell is 44pt wide,
              not a list. */}
          {hasOverflow && (
            <MarkBadge
              label="+"
              onSelectedDay={isSelected}
              testID={`${testID}-overflow`}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

function MarkBadge({
  label,
  onSelectedDay,
  testID,
}: {
  label: string;
  /** The selected day is filled, so the badge needs its own ground on top. */
  onSelectedDay: boolean;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      style={[styles.mark, onSelectedDay && styles.markOnSelected]}
    >
      <Text
        style={[styles.markLabel, onSelectedDay && styles.markLabelOnSelected]}
      >
        {label}
      </Text>
    </View>
  );
}
