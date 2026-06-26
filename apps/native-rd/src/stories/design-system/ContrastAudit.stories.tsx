import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { getContrastRatio } from "../../utils/accessibility";
import { themes, themeNames, type ThemeName } from "../../themes/compose";
import { contrastPairs, AA_NORMAL } from "../../themes/contrastPairs";
import { SectionHeader, shadowStyle } from "./shared";

// ---------------------------------------------------------------------------
// The React Native port of the "Contrast audit" in
// prototypes/screen-redesign/Theme Eval.dc.html. Reads colors directly off the
// composed `themes` objects (not the active runtime theme) so every product
// theme is audited at once — the RN equivalent of the prototype's 7 columns.
//
// The pair list (contrastPairs.ts) is the SAME constant the CI gate in
// themes/__tests__/contrast.test.ts asserts against. Story = visual; test =
// enforcement.
// ---------------------------------------------------------------------------

const AA_LARGE = 3; // amber floor: ≥3 passes for large text, still flagged for normal

const MOOD_NAMES: Record<ThemeName, string> = {
  "light-default": "Full Ride",
  "dark-default": "Night Ride",
  "light-highContrast": "Bold Ink",
  "light-dyslexia": "Warm Studio",
  "light-autismFriendly": "Still Water",
  "light-lowVision": "Loud & Clear",
  "light-lowInfo": "Clean Signal",
};

type Verdict = "pass" | "amber" | "fail";

function verdictFor(ratio: number): Verdict {
  if (ratio >= AA_NORMAL) return "pass";
  if (ratio >= AA_LARGE) return "amber";
  return "fail";
}

const VERDICT_COLOR: Record<Verdict, string> = {
  pass: "#059669",
  amber: "#d97706",
  fail: "#dc2626",
};

const VERDICT_LABEL: Record<Verdict, string> = {
  pass: "AA",
  amber: "3:1",
  fail: "FAIL",
};

// ---------------------------------------------------------------------------

function PairRow({
  label,
  fg,
  bg,
  ratio,
}: {
  label: string;
  fg: string;
  bg: string;
  ratio: number;
}) {
  const verdict = verdictFor(ratio);
  return (
    <View style={styles.pairRow}>
      <View style={[styles.swatch, { backgroundColor: bg }]}>
        <Text style={[styles.swatchText, { color: fg }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={styles.ratio}>{ratio.toFixed(2)}</Text>
      <View style={[styles.pill, { backgroundColor: VERDICT_COLOR[verdict] }]}>
        <Text style={styles.pillText}>{VERDICT_LABEL[verdict]}</Text>
      </View>
    </View>
  );
}

function ThemeCard({ name }: { name: ThemeName }) {
  const theme = themes[name];
  const rows = contrastPairs.map((pair) => {
    const { fg, bg } = pair.getColors(theme);
    return {
      key: pair.key,
      label: pair.label,
      fg,
      bg,
      ratio: getContrastRatio(fg, bg),
    };
  });
  const failCount = rows.filter((r) => verdictFor(r.ratio) === "fail").length;
  const amberCount = rows.filter((r) => verdictFor(r.ratio) === "amber").length;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{MOOD_NAMES[name]}</Text>
        <Text style={styles.cardSubtitle}>{name}</Text>
        <Text style={styles.cardCount}>
          {failCount + amberCount === 0
            ? "all pass"
            : `${failCount} fail · ${amberCount} amber`}
        </Text>
      </View>
      {rows.map((r) => (
        <PairRow
          key={r.key}
          label={r.label}
          fg={r.fg}
          bg={r.bg}
          ratio={r.ratio}
        />
      ))}
    </View>
  );
}

function ContrastAuditContent() {
  return (
    <View>
      <SectionHeader
        title="Contrast Audit"
        description="Every product theme × canonical fg/bg pair, with WCAG ratio and verdict. Green = AA normal (≥4.5), amber = large-text only (≥3), red = fail (<3). Shares contrastPairs.ts with the CI gate."
      />
      <View style={styles.list}>
        {themeNames.map((name) => (
          <ThemeCard key={name} name={name} />
        ))}
      </View>
    </View>
  );
}

const meta: Meta = {
  title: "Design System/Contrast Audit",
};

export default meta;

type Story = StoryObj;

export const Audit: Story = {
  render: () => <ContrastAuditContent />,
};

// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
  list: {
    gap: theme.space[4],
  },
  card: {
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    overflow: "hidden",
    backgroundColor: theme.colors.backgroundSecondary,
    ...shadowStyle(theme, "hardMd"),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: theme.space[2],
    padding: theme.space[3],
    borderBottomWidth: theme.borderWidth.medium,
    borderBottomColor: theme.colors.border,
  },
  cardTitle: {
    fontFamily: theme.fontFamily.headline,
    fontSize: theme.size.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  cardSubtitle: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    color: theme.colors.textMuted,
    flex: 1,
  },
  cardCount: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
  },
  pairRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[2],
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[1],
  },
  swatch: {
    flex: 1,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: theme.space[3],
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
  },
  swatchText: {
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  ratio: {
    width: 44,
    textAlign: "right",
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    color: theme.colors.text,
  },
  pill: {
    width: 48,
    alignItems: "center",
    paddingVertical: theme.space[1],
    borderRadius: theme.radius.sm,
  },
  pillText: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.bold,
    color: "#ffffff",
  },
}));
