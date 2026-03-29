import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import type { Colors } from "../../themes/colorModes";
import { palette } from "../../themes/palette";
import {
  CopiedBadge,
  CopyableToken,
  SectionHeader,
  shadowStyle,
  sharedStyles,
  useCopyToken,
} from "./shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function contrastingText(hex: string): string {
  return isLight(hex) ? "#0a0a0a" : "#fafafa";
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const accentColors = [
  { key: "accentPurple", label: "Purple", hex: palette.accentPurple },
  { key: "accentMint", label: "Mint", hex: palette.accentMint },
  { key: "accentYellow", label: "Yellow", hex: palette.accentYellow },
  { key: "accentEmerald", label: "Emerald", hex: palette.accentEmerald },
  { key: "accentTeal", label: "Teal", hex: palette.accentTeal },
  { key: "accentOrange", label: "Orange", hex: palette.accentOrange },
  { key: "accentSky", label: "Sky", hex: palette.accentSky },
] as const;

const grayScale = [
  { key: "gray50", label: "50", hex: palette.gray50 },
  { key: "gray100", label: "100", hex: palette.gray100 },
  { key: "gray200", label: "200", hex: palette.gray200 },
  { key: "gray300", label: "300", hex: palette.gray300 },
  { key: "gray400", label: "400", hex: palette.gray400 },
  { key: "gray500", label: "500", hex: palette.gray500 },
  { key: "gray600", label: "600", hex: palette.gray600 },
  { key: "gray700", label: "700", hex: palette.gray700 },
  { key: "gray800", label: "800", hex: palette.gray800 },
  { key: "gray900", label: "900", hex: palette.gray900 },
] as const;

type SemanticPair = {
  bgKey: keyof Colors;
  fgKey: keyof Colors;
  label: string;
};

const semanticPairs: SemanticPair[] = [
  { bgKey: "background", fgKey: "text", label: "Background / Text" },
  { bgKey: "backgroundSecondary", fgKey: "text", label: "Secondary BG" },
  { bgKey: "backgroundTertiary", fgKey: "text", label: "Tertiary BG" },
  { bgKey: "accentPrimary", fgKey: "background", label: "Accent Primary" },
  { bgKey: "accentPurple", fgKey: "background", label: "Accent Purple" },
  { bgKey: "accentMint", fgKey: "text", label: "Accent Mint" },
  { bgKey: "accentYellow", fgKey: "text", label: "Accent Yellow" },
  { bgKey: "border", fgKey: "text", label: "Border" },
  { bgKey: "shadow", fgKey: "background", label: "Shadow" },
  { bgKey: "focusRing", fgKey: "background", label: "Focus Ring" },
];

const narrativeSections = ["climb", "drop", "stories", "relief"] as const;
const narrativeLabels: Record<string, string> = {
  climb: "The Climb",
  drop: "The Drop",
  stories: "The Stories",
  relief: "The Relief",
};

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: "Design System/Colors",
};

export default meta;

type Story = StoryObj;

function AccentColorsContent() {
  const { copiedToken, copyToken } = useCopyToken();
  return (
    <View>
      <SectionHeader
        title="Accent Colors"
        description="Vibrant accents drawn from the landing page design language."
      />
      <View style={styles.swatchGrid}>
        {accentColors.map((color) => (
          <Pressable
            key={color.key}
            onPress={() => copyToken(`palette.${color.key}`)}
            style={styles.swatchCard}
          >
            <View style={[styles.swatchColor, { backgroundColor: color.hex }]}>
              <CopiedBadge visible={copiedToken === `palette.${color.key}`} />
            </View>
            <View style={styles.swatchInfo}>
              <Text style={sharedStyles.mono}>{`palette.${color.key}`}</Text>
              <Text style={styles.hexValue}>{color.hex}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export const AccentColors: Story = {
  render: () => <AccentColorsContent />,
};

function GrayScaleContent() {
  const { copiedToken, copyToken } = useCopyToken();
  return (
    <View>
      <SectionHeader
        title="Gray Scale"
        description="Neutral gray palette from 50 (lightest) to 900 (darkest)."
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.grayStrip}>
          {grayScale.map((gray) => (
            <Pressable
              key={gray.key}
              onPress={() => copyToken(`palette.${gray.key}`)}
              style={styles.grayCell}
            >
              <View style={[styles.grayFill, { backgroundColor: gray.hex }]}>
                <CopiedBadge visible={copiedToken === `palette.${gray.key}`} />
              </View>
              <View style={styles.grayMeta}>
                <Text style={styles.grayLabel}>{gray.label}</Text>
                <Text style={styles.grayHex}>{gray.hex}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export const GrayScale: Story = {
  render: () => <GrayScaleContent />,
};

function SemanticCard({ pair }: { pair: SemanticPair }) {
  const { theme } = useUnistyles();
  const { copiedToken, copyToken } = useCopyToken();
  const bgColor = theme.colors[pair.bgKey];
  const fgColor = theme.colors[pair.fgKey];

  return (
    <View style={styles.swatchCard}>
      <View style={[styles.pairPreview, { backgroundColor: bgColor }]}>
        <Text style={[styles.pairPreviewText, { color: fgColor }]}>Aa</Text>
      </View>
      <View style={styles.pairInfo}>
        <Text style={sharedStyles.label}>{pair.label}</Text>
        <CopyableToken
          path={`colors.${pair.bgKey}`}
          copiedToken={copiedToken}
          onCopy={copyToken}
        />
        <CopyableToken
          path={`colors.${pair.fgKey}`}
          copiedToken={copiedToken}
          onCopy={copyToken}
        />
      </View>
    </View>
  );
}

export const SemanticColors: Story = {
  render: () => (
    <View>
      <SectionHeader
        title="Semantic Colors"
        description="Background/foreground pairs for UI contexts. These remap across themes."
      />
      <View style={styles.swatchGrid}>
        {semanticPairs.map((pair) => (
          <SemanticCard key={pair.label} pair={pair} />
        ))}
      </View>
    </View>
  ),
};

// ---------------------------------------------------------------------------
// Narrative section accent chips
// ---------------------------------------------------------------------------

function ClimbAccents({ n }: { n: { bg: string; text: string } }) {
  return (
    <View style={styles.accentRow}>
      <View
        style={[
          styles.badgeChip,
          { backgroundColor: n.text, borderColor: n.text },
        ]}
      >
        <Text style={[styles.badgeChipText, { color: n.bg }]}>BADGE LABEL</Text>
      </View>
      <View
        style={[
          styles.badgeChip,
          { backgroundColor: "transparent", borderColor: n.text },
        ]}
      >
        <Text style={[styles.badgeChipText, { color: n.text }]}>OUTLINE</Text>
      </View>
    </View>
  );
}

function StoriesAccents() {
  const { theme } = useUnistyles();
  const { copiedToken, copyToken } = useCopyToken();
  const accentKeys = ["accent1", "accent2", "accent3", "accent4"] as const;

  return (
    <View style={styles.accentRow}>
      {accentKeys.map((ak) => {
        const bg = theme.narrative.stories[ak];
        return (
          <Pressable
            key={ak}
            onPress={() => copyToken(`narrative.stories.${ak}`)}
            style={[styles.badgeChip, { backgroundColor: bg }]}
          >
            <Text
              style={[styles.badgeChipText, { color: contrastingText(bg) }]}
            >
              {ak.toUpperCase()}
            </Text>
            <CopiedBadge visible={copiedToken === `narrative.stories.${ak}`} />
          </Pressable>
        );
      })}
    </View>
  );
}

function SingleAccentChip({
  tokenPath,
  color,
}: {
  tokenPath: string;
  color: string;
}) {
  const { copiedToken, copyToken } = useCopyToken();

  return (
    <View style={styles.accentRow}>
      <Pressable
        onPress={() => copyToken(tokenPath)}
        style={[styles.badgeChip, { backgroundColor: color }]}
      >
        <Text style={[styles.badgeChipText, { color: contrastingText(color) }]}>
          ACCENT
        </Text>
        <CopiedBadge visible={copiedToken === tokenPath} />
      </Pressable>
    </View>
  );
}

function NarrativeBlock({
  section,
}: {
  section: (typeof narrativeSections)[number];
}) {
  const { theme } = useUnistyles();
  const { copiedToken, copyToken } = useCopyToken();
  const label = narrativeLabels[section];
  const n = theme.narrative[section];

  return (
    <View
      style={[
        styles.narrativeBlock,
        { backgroundColor: n.bg, borderColor: n.text },
      ]}
    >
      <Text style={[styles.narrativeName, { color: n.text }]}>{label}</Text>
      <CopyableToken
        path={`narrative.${section}.bg`}
        copiedToken={copiedToken}
        onCopy={copyToken}
      />
      <CopyableToken
        path={`narrative.${section}.text`}
        copiedToken={copiedToken}
        onCopy={copyToken}
      />
      {section === "climb" && <ClimbAccents n={n} />}
      {section === "stories" && <StoriesAccents />}
      {section === "drop" && (
        <SingleAccentChip
          tokenPath="narrative.drop.accent"
          color={theme.narrative.drop.accent}
        />
      )}
      {section === "relief" && (
        <SingleAccentChip
          tokenPath="narrative.relief.accent"
          color={theme.narrative.relief.accent}
        />
      )}
    </View>
  );
}

export const NarrativeSections: Story = {
  render: () => (
    <View>
      <SectionHeader
        title="Narrative Sections"
        description="The rollercoaster.dev brand story unfolds in four sections, each with its own color palette."
      />
      <View style={styles.narrativeList}>
        {narrativeSections.map((section) => (
          <NarrativeBlock key={section} section={section} />
        ))}
      </View>
    </View>
  ),
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
  swatchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space[3],
  },
  swatchCard: {
    width: "48%",
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    overflow: "hidden",
    backgroundColor: theme.colors.backgroundSecondary,
    ...shadowStyle(theme, "hardMd"),
  },
  swatchColor: {
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: theme.borderWidth.medium,
    borderBottomColor: theme.colors.border,
  },
  swatchInfo: {
    padding: theme.space[2],
    paddingHorizontal: theme.space[3],
  },
  hexValue: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    color: theme.colors.textMuted,
    marginTop: theme.space[1],
    textTransform: "uppercase",
  },
  grayStrip: {
    flexDirection: "row",
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    overflow: "hidden",
    ...shadowStyle(theme, "hardMd"),
  },
  grayCell: {
    width: 72,
  },
  grayFill: {
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: theme.borderWidth.medium,
    borderBottomColor: theme.colors.border,
  },
  grayMeta: {
    padding: theme.space[2],
    alignItems: "center",
    backgroundColor: theme.colors.backgroundSecondary,
  },
  grayLabel: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.semibold,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
  },
  grayHex: {
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.mono,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
  },
  pairPreview: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: theme.borderWidth.medium,
    borderBottomColor: theme.colors.border,
  },
  pairPreviewText: {
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  pairInfo: {
    padding: theme.space[2],
    paddingHorizontal: theme.space[3],
    gap: theme.space[1],
  },
  narrativeList: {
    gap: theme.space[4],
  },
  narrativeBlock: {
    padding: theme.space[6],
    borderWidth: theme.borderWidth.medium,
    borderRadius: theme.radius.sm,
    ...shadowStyle(theme, "hardLg"),
  },
  narrativeName: {
    fontFamily: theme.fontFamily.headline,
    fontSize: theme.size.xl,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: theme.letterSpacing.tight,
    marginBottom: theme.space[3],
  },
  accentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space[2],
    marginTop: theme.space[3],
  },
  badgeChip: {
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.space[1],
    paddingHorizontal: theme.space[3],
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[2],
    ...shadowStyle(theme, "hardSm"),
  },
  badgeChipText: {
    fontWeight: theme.fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: theme.letterSpacing.wide,
    fontSize: theme.size.xs,
  },
}));
