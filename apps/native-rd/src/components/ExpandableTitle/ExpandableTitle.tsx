import { useState } from "react";
import {
  Pressable,
  View,
  type StyleProp,
  type TextLayoutEvent,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Text, type TextVariant } from "../Text";
import { styles } from "./ExpandableTitle.styles";

export interface ExpandableTitleProps {
  title: string;
  variant: TextVariant;
  testID: string;
  /** Lines shown while collapsed. */
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /** Where the toggle sits; titles centred in a hero want a centred toggle. */
  align?: "start" | "center";
  accessibilityRole?: "header" | "text";
}

/**
 * A title that stays compact until it actually needs more room.
 *
 * Long names at large type crowd out the work below them, so the preview is
 * clamped to `numberOfLines`. A hidden unclamped twin measures the full text;
 * only when it overflows does a "Show full title" control appear, and tapping
 * either the title or the control expands it in place. Nothing leaves the
 * screen, nothing animates, and short titles pay no cost.
 *
 * Screen readers already receive the whole text regardless of clamping, so the
 * toggle is purely a visual affordance. It is still a real button for anyone
 * who reaches it.
 */
export function ExpandableTitle({
  title,
  variant,
  testID,
  numberOfLines = 2,
  style,
  containerStyle,
  align = "start",
  accessibilityRole = "header",
}: ExpandableTitleProps) {
  const { t } = useTranslation(["common"]);
  const [expanded, setExpanded] = useState(false);
  const [fullLineCount, setFullLineCount] = useState(0);
  const overflows = fullLineCount > numberOfLines;
  const showToggle = overflows || expanded;

  const onMeasure = (event: TextLayoutEvent) => {
    setFullLineCount(event.nativeEvent.lines.length);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Pressable
        accessible={false}
        disabled={!showToggle}
        onPress={() => setExpanded((v) => !v)}
      >
        <Text
          variant={variant}
          style={style}
          numberOfLines={expanded ? undefined : numberOfLines}
          accessible
          accessibilityRole={accessibilityRole}
          testID={testID}
        >
          {title}
        </Text>
      </Pressable>
      <Text
        variant={variant}
        style={[style, styles.measure]}
        onTextLayout={onMeasure}
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        testID={`${testID}-measure`}
      >
        {title}
      </Text>
      {showToggle ? (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={t(
            expanded
              ? "common:expandableTitle.showLess"
              : "common:expandableTitle.showMore",
          )}
          accessibilityState={{ expanded }}
          testID={`${testID}-toggle`}
          style={[
            styles.toggle,
            { alignSelf: align === "center" ? "center" : "flex-start" },
          ]}
        >
          <Text variant="label" style={styles.toggleText}>
            {t(
              expanded
                ? "common:expandableTitle.showLess"
                : "common:expandableTitle.showMore",
            )}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
