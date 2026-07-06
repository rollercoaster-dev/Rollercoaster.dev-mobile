import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { ScopedTheme, StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { Button } from "../Button";
import { EvidenceTypePicker, CaptureSheetBody } from "./EvidenceTypePicker";
import { EvidenceType } from "../../db";
import type { EvidenceTypeValue } from "../../types/evidence";
import { themes, themeNames, type ThemeName } from "../../themes/compose";

const meta: Meta<typeof EvidenceTypePicker> = {
  title: "Iteration B/Focus Mode/EvidenceTypePicker",
  component: EvidenceTypePicker,
};

export default meta;

type Story = StoryObj<typeof EvidenceTypePicker>;

const noop = () => {};

// --- Capture sheet (mode="capture") ---

// Controlled wrapper: the sheet owns no selection state (D3), so the story holds
// it — a tapped cell sets the pick and closes, mirroring the prototype's `pick`
// handler. The trigger button re-opens the sheet on its current pick. The stage
// is phone-sized and height-bounded: the sheet is an in-tree absolute overlay
// that rises from the bottom of its frame, and Storybook's content-hugging
// decorator would otherwise collapse a flex:1 stage to the button's height.
function CaptureSheetDemo({
  initialType,
}: {
  initialType?: EvidenceTypeValue;
}) {
  const [visible, setVisible] = useState(true);
  const [selectedType, setSelectedType] = useState<
    EvidenceTypeValue | undefined
  >(initialType);

  return (
    <View style={storyStyles.triggerStage}>
      <Button label="Add evidence" onPress={() => setVisible(true)} />
      <EvidenceTypePicker
        mode="capture"
        visible={visible}
        activeStepTitle="Wire the relay panel"
        selectedType={selectedType}
        onSelectType={(type) => {
          setSelectedType(type);
          setVisible(false);
        }}
        onClose={() => setVisible(false)}
      />
    </View>
  );
}

// Note pre-highlighted — the easy default (D5).
export const CaptureSheet: Story = {
  render: () => <CaptureSheetDemo />,
};

// The "change" re-open case (D6): opened with a non-default pick (Photo) already
// highlighted. There is no in-sheet "Change" row — re-opening the sheet on the
// current pick IS the change affordance; the invoker lives outside this component
// (#408's card row / the nav "+", wired by #377). This story IS that demonstration.
export const CaptureSheetChangeScenario: Story = {
  render: () => (
    <CaptureSheetDemo initialType={EvidenceType.photo as EvidenceTypeValue} />
  ),
};

// --- Authoring modes (default — unchanged, backward compatible) ---

function AuthoringChipGridDemo() {
  const [selectedTypes, setSelectedTypes] = useState<EvidenceTypeValue[]>([
    EvidenceType.text as EvidenceTypeValue,
  ]);
  return (
    <View style={storyStyles.padded}>
      {/* `mode` omitted → defaults to "authoring", proving backward compatibility. */}
      <EvidenceTypePicker
        selectedTypes={selectedTypes}
        label="Evidence types"
        onToggleType={(type) =>
          setSelectedTypes((prev) =>
            prev.includes(type)
              ? prev.filter((t) => t !== type)
              : [...prev, type],
          )
        }
      />
    </View>
  );
}

export const AuthoringChipGrid: Story = {
  render: () => <AuthoringChipGridDemo />,
};

export const Compact: Story = {
  render: () => (
    <View style={storyStyles.padded}>
      <EvidenceTypePicker
        compact
        selectedTypes={
          [
            EvidenceType.photo,
            EvidenceType.text,
            EvidenceType.link,
          ] as EvidenceTypeValue[]
        }
      />
    </View>
  ),
};

// --- Theme matrix ---
// The capture sheet across all 7 product themes. We tile `CaptureSheetBody`
// directly rather than the full picker because the picker brings an
// absolute-fill scrim anchored to its parent — seven live pickers would stack
// scrims over the canvas instead of tiling. Same ScopedTheme-per-theme
// approach as FocusCurrentTaskCard.stories' AllThemesMatrix.
const MOOD_NAMES: Record<ThemeName, string> = {
  "light-default": "Full Ride",
  "dark-default": "Night Ride",
  "light-highContrast": "Bold Ink",
  "light-dyslexia": "Warm Studio",
  "light-autismFriendly": "Still Water",
  "light-lowVision": "Loud & Clear",
  "light-lowInfo": "Clean Signal",
};

export const AllThemesMatrix: Story = {
  render: () => (
    <ScrollView contentContainerStyle={storyStyles.matrixContainer}>
      {themeNames.map((name) => (
        <View key={name} style={storyStyles.matrixThemeBlock}>
          <View style={storyStyles.matrixThemeLabel}>
            <Text style={storyStyles.matrixThemeName}>{MOOD_NAMES[name]}</Text>
            <Text style={storyStyles.matrixThemeKey}>{name}</Text>
          </View>
          <ScopedTheme name={name}>
            <View
              style={[
                storyStyles.matrixCard,
                { backgroundColor: themes[name].colors.background },
              ]}
            >
              <CaptureSheetBody
                activeStepTitle="Wire the relay panel"
                selectedType={EvidenceType.text as EvidenceTypeValue}
                onSelectType={noop}
                onClose={noop}
              />
            </View>
          </ScopedTheme>
        </View>
      ))}
    </ScrollView>
  ),
};

// The authoring / chip-grid mode (mode="authoring", the default) across all 7
// themes — the capture matrix above never exercised this mode. Renders the real
// EvidenceTypePicker scoped per theme so the chip borders, selected fill, and
// label all re-theme.
export const AuthoringAllThemes: Story = {
  render: () => (
    <ScrollView contentContainerStyle={storyStyles.matrixContainer}>
      {themeNames.map((name) => (
        <View key={name} style={storyStyles.matrixThemeBlock}>
          <View style={storyStyles.matrixThemeLabel}>
            <Text style={storyStyles.matrixThemeName}>{MOOD_NAMES[name]}</Text>
            <Text style={storyStyles.matrixThemeKey}>{name}</Text>
          </View>
          <ScopedTheme name={name}>
            <View
              style={[
                storyStyles.matrixCard,
                { backgroundColor: themes[name].colors.background },
              ]}
            >
              <EvidenceTypePicker
                selectedTypes={
                  [EvidenceType.text, EvidenceType.photo] as EvidenceTypeValue[]
                }
                label="Evidence types"
                onToggleType={noop}
              />
            </View>
          </ScopedTheme>
        </View>
      ))}
    </ScrollView>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  triggerStage: {
    height: 600,
    width: "100%",
    maxWidth: 390,
    alignSelf: "center" as const,
    padding: theme.space[4],
    gap: theme.space[3],
    backgroundColor: theme.colors.backgroundSecondary,
  },
  padded: {
    padding: theme.space[4],
    backgroundColor: theme.colors.background,
  },
  matrixContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    padding: theme.space[4],
    gap: theme.space[6],
    backgroundColor: theme.colors.backgroundSecondary,
  },
  matrixThemeBlock: {
    gap: theme.space[2],
  },
  matrixThemeLabel: {
    gap: theme.space[1],
  },
  matrixThemeName: {
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  matrixThemeKey: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    color: theme.colors.textMuted,
  },
  // Prototype phone width so the tiled sheet reads like the real bottom sheet.
  matrixCard: {
    width: 344,
  },
}));
