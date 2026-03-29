import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Text, View, type TextStyle } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import type { ComposedTheme } from "../../themes/compose";
import { fontFamily } from "../../themes/tokens";
import {
  CopyableToken,
  SectionHeader,
  shadowStyle,
  sharedStyles,
  useCopyToken,
} from "./shared";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const usageExamples = [
  {
    context: "Hero / Display",
    font: "Anybody",
    text: "Own Your Story",
    styleKey: "display",
    tokens:
      "fontFamily.headline + size.4xl + fontWeight.black + letterSpacing.tight",
    note: "Only for large splash/display text. Not for regular headings.",
  },
  {
    context: "Page Heading (h1)",
    font: "Anybody",
    text: "Badge Collection",
    styleKey: "headline",
    tokens:
      "fontFamily.headline + size.2xl + fontWeight.bold + letterSpacing.tight",
    note: "Uses the headline (display) font at 2xl.",
  },
  {
    context: "Section Heading (h2)",
    font: "Instrument Sans",
    text: "Verification Status",
    styleKey: "title",
    tokens: "fontFamily.body + size.lg + fontWeight.semibold",
    note: "",
  },
  {
    context: "Subsection (h3)",
    font: "Instrument Sans",
    text: "Issuer Details",
    styleKey: "subsection",
    tokens: "fontFamily.body + size.md + fontWeight.semibold",
    note: "",
  },
  {
    context: "Body Text",
    font: "Instrument Sans",
    text: "Open Badges empower learners to own and share their achievements in a portable, verifiable format.",
    styleKey: "body",
    tokens: "fontFamily.body + size.md + fontWeight.normal + lineHeight.normal",
    note: "",
  },
  {
    context: "Description / Caption",
    font: "Instrument Sans",
    text: "Issued on 2024-01-15 by rollercoaster.dev",
    styleKey: "caption",
    tokens:
      "fontFamily.body + size.xs + fontWeight.normal + letterSpacing.label",
    note: "",
  },
  {
    context: "Badge Label / Tag",
    font: "Instrument Sans",
    text: "VERIFIED",
    styleKey: "label",
    tokens:
      "fontFamily.body + size.sm + fontWeight.medium + letterSpacing.wide",
    note: "Uppercase with wide tracking. See badge-label class in narrative.css.",
  },
  {
    context: "Code / Token Names",
    font: "DM Mono",
    text: "theme.colors.accentPrimary",
    styleKey: "mono",
    tokens: "fontFamily.mono + size.sm",
    note: "Also used for all metadata values and technical labels.",
  },
  {
    context: "Accessibility Override",
    font: "Atkinson / Lexend / OpenDyslexic",
    text: "These fonts replace the body font when a user selects an accessibility theme.",
    styleKey: "a11y",
    tokens: "fontFamily.atkinson / fontFamily.lexend / fontFamily.opendyslexic",
    note: "Applied via theme variant. Never hard-code body font.",
  },
] as const;

const fontFamilyData = [
  {
    name: "Instrument Sans",
    token: "fontFamily.body",
    familyKey: "body" as const,
    role: "Primary body font",
    weight: "400" as const,
  },
  {
    name: "Anybody",
    token: "fontFamily.headline",
    familyKey: "headline" as const,
    role: "Display / headline font",
    weight: "900" as const,
  },
  {
    name: "DM Mono",
    token: "fontFamily.mono",
    familyKey: "mono" as const,
    role: "Monospace / code font",
    weight: "400" as const,
  },
  {
    name: "Atkinson Hyperlegible",
    token: "fontFamily.atkinson",
    familyKey: null,
    rawFont: fontFamily.atkinson,
    role: "High-legibility accessibility font",
    weight: "400" as const,
  },
  {
    name: "Lexend",
    token: "fontFamily.lexend",
    familyKey: null,
    rawFont: fontFamily.lexend,
    role: "Reading-optimized accessibility font",
    weight: "400" as const,
  },
  {
    name: "OpenDyslexic",
    token: "fontFamily.opendyslexic",
    familyKey: null,
    rawFont: fontFamily.opendyslexic,
    role: "Dyslexia-friendly accessibility font",
    weight: "400" as const,
  },
] as const;

const typeScaleKeys = [
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
  "6xl",
  "7xl",
  "display",
] as const;

const fontWeightEntries = [
  { label: "Normal", key: "normal", value: "400" },
  { label: "Medium", key: "medium", value: "500" },
  { label: "Semibold", key: "semibold", value: "600" },
  { label: "Bold", key: "bold", value: "700" },
  { label: "Black", key: "black", value: "900" },
] as const;

const lineHeightPresets = [
  { label: "Tight", multiplier: 1.05, desc: "Single-line display headlines" },
  { label: "Compact", multiplier: 1.3, desc: "Compact metadata" },
  { label: "Normal", multiplier: 1.6, desc: "Body text default" },
  { label: "Relaxed", multiplier: 1.8, desc: "Spacious reading" },
] as const;

const letterSpacingEntries = [
  { label: "Tight", key: "tight", desc: "Headlines" },
  { label: "Normal", key: "normal", desc: "Body text" },
  { label: "Label", key: "label", desc: "Uppercase labels" },
  { label: "Wide", key: "wide", desc: "Wide tracking" },
  { label: "Caps", key: "caps", desc: "All-caps text" },
] as const;

const SAMPLE_TEXT = "The quick brown fox jumps over the lazy dog";
const LARGE_SCALE_KEYS = new Set(["5xl", "6xl", "7xl", "display"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUsageStyle(key: string, theme: ComposedTheme) {
  // Use canonical textStyles for the 7 presets defined in compose.ts
  const canonical = (theme.textStyles as unknown as Record<string, object>)[
    key
  ];
  if (canonical) {
    return {
      ...canonical,
      color: key === "caption" ? theme.colors.textMuted : theme.colors.text,
      ...(key === "label" ? { textTransform: "uppercase" as const } : {}),
    };
  }
  // Fallback for story-only presets not in textStyles
  const extras: Record<string, object> = {
    subsection: {
      fontFamily: theme.fontFamily.body,
      fontSize: theme.size.md,
      fontWeight: theme.fontWeight.semibold,
      lineHeight: Math.round(theme.size.md * 1.3),
      color: theme.colors.text,
    },
    a11y: {
      fontFamily: theme.fontFamily.body,
      fontSize: theme.size.md,
      lineHeight: Math.round(theme.size.md * 1.6),
      color: theme.colors.text,
    },
  };
  return extras[key] ?? {};
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: "Design System/Typography",
};
export default meta;
type Story = StoryObj;

function FontUsageGuideContent() {
  const { theme } = useUnistyles();
  const { copiedToken, copyToken } = useCopyToken();
  return (
    <View>
      <SectionHeader
        title="When to Use What"
        description="Anybody is reserved for display/hero text only. All UI headings (h1-h3) use Instrument Sans. DM Mono handles code and metadata. Accessibility fonts replace the body font via theme."
      />
      <View style={styles.usageList}>
        {usageExamples.map((ex) => (
          <View key={ex.context} style={styles.usageCard}>
            <View style={styles.previewBox}>
              <Text style={getUsageStyle(ex.styleKey, theme)} numberOfLines={2}>
                {ex.text}
              </Text>
            </View>
            <View style={styles.usageInfo}>
              <View style={styles.usageHeaderRow}>
                <Text style={styles.usageContext}>{ex.context}</Text>
                <Text style={styles.usageFont}>{ex.font}</Text>
              </View>
              <CopyableToken
                path={ex.tokens}
                copiedToken={copiedToken}
                onCopy={copyToken}
              />
              {ex.note ? <Text style={styles.usageNote}>{ex.note}</Text> : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export const FontUsageGuide: Story = {
  render: () => <FontUsageGuideContent />,
};

function FontFamiliesContent() {
  const { theme } = useUnistyles();
  const { copiedToken, copyToken } = useCopyToken();
  return (
    <View>
      <SectionHeader
        title="Font Families"
        description="Three design fonts and three accessibility-optimized alternatives."
      />
      <View style={styles.sampleList}>
        {fontFamilyData.map((f) => {
          const fontName = f.familyKey
            ? theme.fontFamily[f.familyKey]
            : f.rawFont;
          return (
            <View key={f.token} style={styles.sampleRow}>
              <Text
                style={[
                  styles.sampleText,
                  { fontFamily: fontName, fontWeight: f.weight },
                ]}
                numberOfLines={1}
              >
                {SAMPLE_TEXT}
              </Text>
              <View style={styles.sampleMeta}>
                <Text style={styles.metaName}>{f.name}</Text>
                <Text style={sharedStyles.metaRole}>{f.role}</Text>
                <CopyableToken
                  path={f.token}
                  copiedToken={copiedToken}
                  onCopy={copyToken}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export const FontFamilies: Story = {
  render: () => <FontFamiliesContent />,
};

function TypeScaleRow({ scaleKey }: { scaleKey: string }) {
  const { theme } = useUnistyles();
  const { copiedToken, copyToken } = useCopyToken();
  const fontSize = (theme.size as Record<string, number>)[scaleKey] ?? 16;

  return (
    <View style={styles.sampleRow}>
      <Text
        style={[
          styles.sampleTextBase,
          {
            fontSize,
            fontFamily: theme.fontFamily.body,
            color: theme.colors.text,
            lineHeight: Math.round(fontSize * 1.3),
          },
        ]}
        numberOfLines={LARGE_SCALE_KEYS.has(scaleKey) ? 1 : undefined}
      >
        {SAMPLE_TEXT}
      </Text>
      <View style={styles.sampleMeta}>
        <Text style={styles.metaName}>{scaleKey}</Text>
        <Text style={sharedStyles.metaRole}>{`${fontSize}px`}</Text>
        <CopyableToken
          path={`size.${scaleKey}`}
          copiedToken={copiedToken}
          onCopy={copyToken}
        />
      </View>
    </View>
  );
}

export const TypeScale: Story = {
  render: () => (
    <View>
      <SectionHeader
        title="Type Scale"
        description="12-step scale from xs (12px) to display (96px)."
      />
      <View style={styles.sampleList}>
        {typeScaleKeys.map((key) => (
          <TypeScaleRow key={key} scaleKey={key} />
        ))}
      </View>
    </View>
  ),
};

function FontWeightRow({
  entry,
}: {
  entry: (typeof fontWeightEntries)[number];
}) {
  const { theme } = useUnistyles();
  const { copiedToken, copyToken } = useCopyToken();
  const weight =
    (theme.fontWeight as Record<string, string>)[entry.key] ?? "400";

  return (
    <View style={styles.sampleRow}>
      <Text
        style={[
          styles.sampleTextBase,
          {
            fontSize: theme.size.xl,
            fontWeight: weight as TextStyle["fontWeight"],
            fontFamily: theme.fontFamily.body,
            color: theme.colors.text,
            lineHeight: Math.round(theme.size.xl * 1.3),
          },
        ]}
      >
        {SAMPLE_TEXT}
      </Text>
      <View style={styles.sampleMeta}>
        <Text style={styles.metaName}>{entry.label}</Text>
        <Text style={sharedStyles.metaRole}>{entry.value}</Text>
        <CopyableToken
          path={`fontWeight.${entry.key}`}
          copiedToken={copiedToken}
          onCopy={copyToken}
        />
      </View>
    </View>
  );
}

export const FontWeights: Story = {
  render: () => (
    <View>
      <SectionHeader
        title="Font Weights"
        description="Five weight steps from normal (400) to black (900)."
      />
      <View style={styles.sampleList}>
        {fontWeightEntries.map((entry) => (
          <FontWeightRow key={entry.key} entry={entry} />
        ))}
      </View>
    </View>
  ),
};

function LineHeightCard({
  preset,
}: {
  preset: (typeof lineHeightPresets)[number];
}) {
  const { theme } = useUnistyles();
  const { copiedToken, copyToken } = useCopyToken();
  const token = `lineHeight.${preset.label.toLowerCase()}`;

  return (
    <View style={styles.lhCard}>
      <View style={styles.lhCardHeader}>
        <Text style={styles.metaName}>{preset.label}</Text>
        <Text style={sharedStyles.mono}>{preset.multiplier}</Text>
      </View>
      <View style={styles.lhSampleBox}>
        <Text
          style={{
            fontSize: theme.size.sm,
            fontFamily: theme.fontFamily.body,
            color: theme.colors.text,
            lineHeight: Math.round(theme.size.sm * preset.multiplier),
          }}
        >
          Open Badges empower learners to own and share their achievements in a
          portable, verifiable format that works across platforms.
        </Text>
      </View>
      <Text style={sharedStyles.metaRole}>{preset.desc}</Text>
      <CopyableToken
        path={token}
        copiedToken={copiedToken}
        onCopy={copyToken}
      />
    </View>
  );
}

function LetterSpacingRow({
  entry,
}: {
  entry: (typeof letterSpacingEntries)[number];
}) {
  const { theme } = useUnistyles();
  const { copiedToken, copyToken } = useCopyToken();
  const token = `letterSpacing.${entry.key}`;
  const tracking =
    (theme.letterSpacing as Record<string, number>)[entry.key] ?? 0;

  return (
    <View style={styles.sampleRow}>
      <Text
        style={[
          styles.sampleTextBase,
          {
            fontSize: theme.size.sm,
            fontWeight: theme.fontWeight.bold,
            fontFamily: theme.fontFamily.body,
            letterSpacing: tracking,
            color: theme.colors.text,
            lineHeight: Math.round(theme.size.sm * 1.3),
          },
        ]}
        numberOfLines={1}
      >
        OPEN BADGES CREDENTIAL
      </Text>
      <View style={styles.sampleMeta}>
        <Text style={styles.metaName}>{entry.label}</Text>
        <Text style={sharedStyles.metaRole}>{entry.desc}</Text>
        <CopyableToken
          path={token}
          copiedToken={copiedToken}
          onCopy={copyToken}
        />
      </View>
    </View>
  );
}

export const LineHeightsAndLetterSpacing: Story = {
  render: () => (
    <View>
      <SectionHeader
        title="Line Heights"
        description="Four line-height presets for different content density levels."
      />
      <View style={styles.lhGrid}>
        {lineHeightPresets.map((preset) => (
          <LineHeightCard key={preset.label} preset={preset} />
        ))}
      </View>

      <View style={styles.spacer} />

      <SectionHeader
        title="Letter Spacing"
        description="Five tracking presets for different text roles."
      />
      <View style={styles.sampleList}>
        {letterSpacingEntries.map((entry) => (
          <LetterSpacingRow key={entry.key} entry={entry} />
        ))}
      </View>
    </View>
  ),
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
  usageList: {
    gap: theme.space[3],
  },
  usageCard: {
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    overflow: "hidden",
    backgroundColor: theme.colors.backgroundSecondary,
  },
  previewBox: {
    padding: theme.space[4],
    paddingHorizontal: theme.space[5],
    borderBottomWidth: theme.borderWidth.medium,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  usageInfo: {
    padding: theme.space[3],
    paddingHorizontal: theme.space[5],
    gap: theme.space[1],
  },
  usageHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  usageContext: {
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.semibold,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
  },
  usageFont: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.body,
    textTransform: "uppercase",
    letterSpacing: theme.letterSpacing.label,
    color: theme.colors.textMuted,
  },
  usageNote: {
    fontSize: theme.size.xs,
    fontStyle: "italic",
    fontFamily: theme.fontFamily.body,
    color: theme.colors.textMuted,
    marginTop: theme.space[1],
  },
  sampleList: {
    gap: theme.space[3],
  },
  sampleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: theme.space[4],
    padding: theme.space[3],
    paddingHorizontal: theme.space[4],
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  sampleText: {
    flex: 1,
    fontSize: theme.size.lg,
    color: theme.colors.text,
    lineHeight: Math.round(theme.size.lg * 1.3),
  },
  sampleTextBase: {
    flex: 1,
  },
  sampleMeta: {
    minWidth: 160,
    gap: 2,
  },
  metaName: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.semibold,
    fontFamily: theme.fontFamily.mono,
    color: theme.colors.text,
  },
  lhGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space[3],
  },
  lhCard: {
    width: "48%",
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.space[4],
    gap: theme.space[2],
    backgroundColor: theme.colors.backgroundSecondary,
    ...shadowStyle(theme, "hardMd"),
  },
  lhCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  lhSampleBox: {
    padding: theme.space[3],
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
  },
  spacer: {
    height: theme.space[12],
  },
}));
