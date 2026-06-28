import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { ScrollView, Text, View } from "react-native";
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
type AuditCell = {
  key: string;
  label: string;
  fg: string;
  bg: string;
  ratio: number;
  verdict: Verdict;
};
type ThemeAudit = {
  name: ThemeName;
  label: string;
  rows: AuditCell[];
  failCount: number;
  amberCount: number;
};

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

function buildThemeAudit(name: ThemeName): ThemeAudit {
  const theme = themes[name];
  const rows = contrastPairs.map((pair) => {
    const { fg, bg } = pair.getColors(theme);
    const ratio = getContrastRatio(fg, bg);
    return {
      key: pair.key,
      label: pair.label,
      fg,
      bg,
      ratio,
      verdict: verdictFor(ratio),
    };
  });

  return {
    name,
    label: MOOD_NAMES[name],
    rows,
    failCount: rows.filter((r) => r.verdict === "fail").length,
    amberCount: rows.filter((r) => r.verdict === "amber").length,
  };
}

function buildAudit() {
  return themeNames.map((name) => buildThemeAudit(name));
}

function auditTotals(audit: ThemeAudit[]) {
  return audit.reduce(
    (acc, themeAudit) => ({
      total: acc.total + themeAudit.rows.length,
      fail: acc.fail + themeAudit.failCount,
      amber: acc.amber + themeAudit.amberCount,
    }),
    { total: 0, fail: 0, amber: 0 },
  );
}

function PairRow({
  label,
  fg,
  bg,
  ratio,
  verdict,
}: {
  label: string;
  fg: string;
  bg: string;
  ratio: number;
  verdict: Verdict;
}) {
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
  const audit = buildThemeAudit(name);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{audit.label}</Text>
        <Text style={styles.cardSubtitle}>{name}</Text>
        <Text style={styles.cardCount}>
          {audit.failCount + audit.amberCount === 0
            ? "all pass"
            : `${audit.failCount} fail · ${audit.amberCount} amber`}
        </Text>
      </View>
      {audit.rows.map((r) => (
        <PairRow
          key={r.key}
          label={r.label}
          fg={r.fg}
          bg={r.bg}
          ratio={r.ratio}
          verdict={r.verdict}
        />
      ))}
    </View>
  );
}

function ContrastAuditContent() {
  const audit = buildAudit();
  const totals = auditTotals(audit);
  return (
    <View>
      <SectionHeader
        title="Contrast Audit"
        description="Every product theme × canonical fg/bg pair, with WCAG ratio and verdict. Green = AA normal (≥4.5), amber = large-text only (≥3), red = fail (<3). Shares contrastPairs.ts with the CI gate."
      />
      <SummaryBanner totals={totals} />
      <View style={styles.list}>
        {audit.map((themeAudit) => (
          <ThemeCard key={themeAudit.name} name={themeAudit.name} />
        ))}
      </View>
    </View>
  );
}

function SummaryBanner({
  totals,
}: {
  totals: { total: number; fail: number; amber: number };
}) {
  const allPass = totals.fail + totals.amber === 0;
  return (
    <View
      style={[
        styles.summary,
        {
          borderColor: allPass ? VERDICT_COLOR.pass : VERDICT_COLOR.fail,
        },
      ]}
    >
      <Text style={styles.summaryTitle}>
        {allPass ? "All audited pairs pass AA" : "Contrast audit has findings"}
      </Text>
      <Text style={styles.summaryText}>
        {totals.total} cells · {totals.fail} fail · {totals.amber} amber ·{" "}
        {totals.total - totals.fail - totals.amber} AA
      </Text>
    </View>
  );
}

function MatrixCell({ cell }: { cell: AuditCell }) {
  return (
    <View
      style={[styles.matrixCell, { backgroundColor: MATRIX_BG[cell.verdict] }]}
    >
      <Text
        style={[styles.matrixRatio, { color: VERDICT_COLOR[cell.verdict] }]}
      >
        {cell.ratio.toFixed(1)}
      </Text>
      <View style={styles.matrixSwatches}>
        <View style={[styles.miniSwatch, { backgroundColor: cell.fg }]} />
        <View style={[styles.miniSwatch, { backgroundColor: cell.bg }]} />
      </View>
    </View>
  );
}

function ContrastMatrixContent() {
  const audit = buildAudit();
  const totals = auditTotals(audit);

  return (
    <View>
      <SectionHeader
        title="Contrast Matrix"
        description="Matrix view of the same canonical contrastPairs.ts data used by the Jest gate. Rows are fg/bg pairs; columns are product themes."
      />
      <SummaryBanner totals={totals} />
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={styles.matrix}>
          <View style={styles.matrixRow}>
            <View style={[styles.matrixHeaderCell, styles.matrixPairCell]}>
              <Text style={styles.matrixHeaderText}>pair</Text>
            </View>
            {audit.map((themeAudit) => (
              <View key={themeAudit.name} style={styles.matrixHeaderCell}>
                <Text style={styles.matrixHeaderText}>{themeAudit.label}</Text>
                <Text style={styles.matrixSubheadText}>{themeAudit.name}</Text>
              </View>
            ))}
          </View>
          {contrastPairs.map((pair) => (
            <View key={pair.key} style={styles.matrixRow}>
              <View style={[styles.matrixPairCell, styles.matrixLabelCell]}>
                <Text style={styles.matrixLabel}>{pair.label}</Text>
                <Text style={styles.matrixSubheadText}>{pair.key}</Text>
              </View>
              {audit.map((themeAudit) => {
                const cell = themeAudit.rows.find((r) => r.key === pair.key);
                if (!cell) return null;
                return <MatrixCell key={themeAudit.name} cell={cell} />;
              })}
            </View>
          ))}
        </View>
      </ScrollView>
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

export const Matrix: Story = {
  render: () => <ContrastMatrixContent />,
};

// ---------------------------------------------------------------------------

const MATRIX_BG: Record<Verdict, string> = {
  pass: "#ecfdf5",
  amber: "#fffbeb",
  fail: "#fef2f2",
};

const styles = StyleSheet.create((theme) => ({
  summary: {
    borderWidth: theme.borderWidth.medium,
    borderRadius: theme.radius.sm,
    padding: theme.space[3],
    marginBottom: theme.space[4],
    backgroundColor: theme.colors.backgroundSecondary,
  },
  summaryTitle: {
    fontFamily: theme.fontFamily.headline,
    fontSize: theme.size.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  summaryText: {
    marginTop: theme.space[1],
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    color: theme.colors.textMuted,
  },
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
  matrix: {
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    overflow: "hidden",
    backgroundColor: theme.colors.backgroundSecondary,
  },
  matrixRow: {
    flexDirection: "row",
  },
  matrixHeaderCell: {
    width: 132,
    minHeight: 52,
    justifyContent: "center",
    padding: theme.space[2],
    borderBottomWidth: theme.borderWidth.medium,
    borderBottomColor: theme.colors.border,
    borderLeftWidth: theme.borderWidth.thin,
    borderLeftColor: theme.colors.border,
  },
  matrixHeaderText: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  matrixSubheadText: {
    marginTop: theme.space[1],
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    color: theme.colors.textMuted,
  },
  matrixPairCell: {
    width: 132,
    borderLeftWidth: 0,
  },
  matrixLabelCell: {
    minHeight: 46,
    justifyContent: "center",
    padding: theme.space[2],
    borderBottomWidth: theme.borderWidth.thin,
    borderBottomColor: theme.colors.border,
  },
  matrixLabel: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  matrixCell: {
    width: 132,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.space[2],
    borderBottomWidth: theme.borderWidth.thin,
    borderBottomColor: theme.colors.border,
    borderLeftWidth: theme.borderWidth.thin,
    borderLeftColor: theme.colors.border,
  },
  matrixRatio: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.bold,
  },
  matrixSwatches: {
    flexDirection: "row",
    gap: theme.space[1],
  },
  miniSwatch: {
    width: 14,
    height: 14,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
  },
}));
