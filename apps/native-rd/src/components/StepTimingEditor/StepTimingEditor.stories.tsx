import type { Meta, StoryObj } from "@storybook/react";
import React, { useRef, useState } from "react";
import { ScrollView, View, type View as RNView } from "react-native";
import { ScopedTheme, StyleSheet } from "react-native-unistyles";
import { Text } from "../Text";
import { formatDate } from "../../utils/format";
import { StepTimingEditor } from "./StepTimingEditor";
import type { StepTimingCandidate, StepTimingValue } from "./types";
import { themes, themeNames, type ThemeName } from "../../themes/compose";

const meta: Meta<typeof StepTimingEditor> = {
  title: "Set B & C/StepTimingEditor",
  component: StepTimingEditor,
};

export default meta;

type Story = StoryObj<typeof StepTimingEditor>;

/** The Direction D prototype's pinned instant — Wed 24 June 2026. */
const NOW = new Date(2026, 5, 24);

const label = (iso: string | null) => formatDate(iso, "en-US");

/**
 * The prototype's "Rewire the workshop" plan, flattened the way a caller would
 * hand it over: every step and sub-step *except* the one being edited.
 */
const CANDIDATES: StepTimingCandidate[] = [
  {
    id: "s1",
    title: "Plan layout & buy materials",
    label: "1",
    isCompleted: true,
    dueDate: null,
  },
  {
    id: "s2",
    title: "Wire the circuits",
    label: "2",
    isCompleted: true,
    dueDate: null,
  },
  {
    id: "s3",
    title: "Inspection & labels",
    label: "3",
    dueDate: "2026-06-30",
    dueDateLabel: label("2026-06-30"),
  },
  {
    id: "s3a",
    title: "Book the inspection",
    label: "a",
    isSubStep: true,
    isCompleted: true,
    dueDate: null,
  },
  {
    id: "s3b",
    title: "Walk the inspector through",
    label: "b",
    isSubStep: true,
    dueDate: "2026-06-26",
    dueDateLabel: label("2026-06-26"),
  },
  {
    id: "s3c",
    title: "Fix any call-outs",
    label: "c",
    isSubStep: true,
    dueDate: null,
  },
  { id: "s5", title: "Final walkthrough", label: "5", dueDate: null },
];

/** The days the rest of the plan sits on, as the grid's marks. */
const MARKS = CANDIDATES.filter((c) => c.dueDate).map((c) => ({
  date: c.dueDate as string,
  label: c.label,
}));

/**
 * Every story drives a live component: the timing line is the affordance, so a
 * reviewer must be able to tap it, edit a draft, and watch what commits.
 */
function LiveEditor({
  initial = { dueDate: null, afterStepId: null },
  candidates = CANDIDATES,
  isCompleted,
  startExpanded,
}: {
  initial?: StepTimingValue;
  candidates?: StepTimingCandidate[];
  isCompleted?: boolean;
  startExpanded?: boolean;
}) {
  const [value, setValue] = useState<StepTimingValue>(initial);
  const [log, setLog] = useState<string>("—");
  // Stories that want to land on the open editor drive expansion through the
  // controlled prop; tapping the timing line still collapses it from here.
  const [isOpen, setIsOpen] = useState(Boolean(startExpanded));

  const dependency = candidates.find((c) => c.id === value.afterStepId);

  return (
    <View style={storyStyles.stack}>
      <StepTimingEditor
        value={value}
        now={NOW}
        candidates={candidates}
        isCompleted={isCompleted}
        marks={MARKS}
        afterStepTitle={dependency?.title ?? null}
        afterStepIsCompleted={dependency?.isCompleted}
        dueDateLabel={value.dueDate ? label(value.dueDate) : null}
        expanded={isOpen}
        onExpandedChange={setIsOpen}
        onCommit={(next) => {
          setValue(next);
          setLog(
            `onCommit → due ${next.dueDate ?? "null"}, after ${next.afterStepId ?? "null"}`,
          );
        }}
        onClear={() => {
          setValue({ dueDate: null, afterStepId: null });
          setLog("onClear");
        }}
      />
      <Text style={storyStyles.readout}>{log}</Text>
    </View>
  );
}

function PhoneWidth({ children }: { children: React.ReactNode }) {
  return (
    <View style={storyStyles.stage}>
      <View style={storyStyles.frame}>{children}</View>
    </View>
  );
}

/** Nothing set. One quiet `＋ when?` — one affordance, not two chips. */
export const Unset: Story = {
  render: () => (
    <PhoneWidth>
      <LiveEditor />
    </PhoneWidth>
  ),
};

/** A date and no dependency: a single `due` truth line. */
export const DateOnly: Story = {
  render: () => (
    <PhoneWidth>
      <LiveEditor initial={{ dueDate: "2026-07-02", afterStepId: null }} />
    </PhoneWidth>
  ),
};

/** A dependency and no date: a single `after` truth line. */
export const DependencyOnly: Story = {
  render: () => (
    <PhoneWidth>
      <LiveEditor initial={{ dueDate: null, afterStepId: "s3" }} />
    </PhoneWidth>
  ),
};

/** Both lines, stacked — the most a timing line ever shows. */
export const Both: Story = {
  render: () => (
    <PhoneWidth>
      <LiveEditor initial={{ dueDate: "2026-07-02", afterStepId: "s3" }} />
    </PhoneWidth>
  ),
};

/**
 * A date that has already passed. It reads exactly like any other date — no
 * red, no "overdue", no day count. A passed date never reads as late.
 */
export const PastDate: Story = {
  render: () => (
    <PhoneWidth>
      <LiveEditor initial={{ dueDate: "2026-06-12", afterStepId: null }} />
    </PhoneWidth>
  ),
};

/**
 * Editing an existing pair: tap the timing line to open on the committed
 * values, change either, and `Done` to commit — or collapse to discard.
 */
export const EditingAnExistingPair: Story = {
  render: () => (
    <PhoneWidth>
      <LiveEditor
        initial={{ dueDate: "2026-06-30", afterStepId: "s3b" }}
        startExpanded
      />
    </PhoneWidth>
  ),
};

/**
 * The ordering note. Open the editor: the draft day (Jun 26) falls before the
 * day its dependency sits on (Jun 30), so the fact is stated in plain body
 * copy. Nothing is disabled and the selection stands.
 */
export const OrderingNoteVisible: Story = {
  render: () => (
    <PhoneWidth>
      <LiveEditor
        initial={{ dueDate: "2026-06-26", afterStepId: "s3" }}
        startExpanded
      />
    </PhoneWidth>
  ),
};

/** A goal's first step: nothing to depend on yet, so the picker says so. */
export const NoCandidates: Story = {
  render: () => (
    <PhoneWidth>
      <LiveEditor candidates={[]} />
    </PhoneWidth>
  ),
};

/**
 * A completed step with no timing carries **no** `＋ when?` at all — nothing is
 * left to plan on it. (The row renders nothing here; that is the point.)
 */
export const CompletedStep: Story = {
  render: () => (
    <PhoneWidth>
      <View style={storyStyles.stack}>
        <Text style={storyStyles.readout}>
          completed + no timing → no affordance at all:
        </Text>
        <LiveEditor isCompleted />
        <Text style={storyStyles.readout}>
          completed + existing timing → still shows its lines:
        </Text>
        <LiveEditor
          isCompleted
          initial={{ dueDate: "2026-06-20", afterStepId: "s2" }}
        />
      </View>
    </PhoneWidth>
  ),
};

/** A sub-step behaves identically — both tiers use the same editor. */
export const SubStep: Story = {
  render: () => (
    <PhoneWidth>
      <View style={storyStyles.subStepIndent}>
        <LiveEditor initial={{ dueDate: null, afterStepId: "s3a" }} />
      </View>
    </PhoneWidth>
  ),
};

/**
 * The one that demonstrates the scroll requirement (and the reason `onExpand`
 * exists): several rows in a `ScrollView`, one open at a time via the
 * controlled `expanded` prop, each expansion parking its row at the top of the
 * list. Open the bottom row — without the park, its editor would unfold
 * off-screen and the tap would read as having done nothing.
 */
export const InsideAScrollingList: Story = {
  render: function InsideAScrollingListStory() {
    const scrollRef = useRef<ScrollView | null>(null);
    const contentRef = useRef<RNView | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);

    const rows = CANDIDATES.filter((c) => !c.isSubStep);

    return (
      <View style={storyStyles.stage}>
        <View style={storyStyles.scrollFrame}>
          <ScrollView ref={scrollRef} testID="story-scroll">
            <View ref={contentRef}>
              {rows.map((row) => (
                <View key={row.id} style={storyStyles.row}>
                  <Text style={storyStyles.rowTitle}>
                    {row.label}. {row.title}
                  </Text>
                  <StepTimingEditor
                    value={{
                      dueDate: row.dueDate,
                      afterStepId: null,
                    }}
                    now={NOW}
                    candidates={CANDIDATES.filter((c) => c.id !== row.id)}
                    marks={MARKS}
                    dueDateLabel={row.dueDate ? label(row.dueDate) : null}
                    // One editor open at a time: opening another collapses the
                    // first. A self-contained component cannot enforce this,
                    // which is what the controlled prop is for.
                    expanded={openId === row.id}
                    onExpandedChange={(next) => setOpenId(next ? row.id : null)}
                    onExpand={(rowRef) => {
                      // Park the opened row at the top of the list.
                      const node = rowRef.current;
                      const content = contentRef.current;
                      if (!node || !content) return;
                      node.measureLayout(content, (_x, y) => {
                        scrollRef.current?.scrollTo({ y, animated: true });
                      });
                    }}
                    onCommit={() => setOpenId(null)}
                    onClear={() => setOpenId(null)}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  },
};

const MOOD_NAMES: Record<ThemeName, string> = {
  "light-default": "Full Ride",
  "dark-default": "Night Ride",
  "light-highContrast": "Bold Ink",
  "light-dyslexia": "Warm Studio",
  "light-autismFriendly": "Still Water",
  "light-lowVision": "Loud & Clear",
  "light-lowInfo": "Clean Signal",
};

/**
 * All 7 product themes, each rendering the expanded editor with both lines set
 * and the ordering note visible — the richest chrome the component has.
 *
 * `light-lowVision` doubles as #573's `largeText` density check: it carries the
 * same `sizeL` scale (`src/themes/variants.ts:128`) that `largeText` applies,
 * and `largeText` is a composable variant rather than a registered theme name.
 */
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
              <StepTimingEditor
                value={{ dueDate: "2026-06-26", afterStepId: "s3" }}
                now={NOW}
                candidates={CANDIDATES}
                marks={MARKS}
                afterStepTitle="Inspection & labels"
                dueDateLabel={label("2026-06-26")}
                expanded
                onCommit={() => {}}
                onClear={() => {}}
              />
            </View>
          </ScopedTheme>
        </View>
      ))}
    </ScrollView>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  stage: {
    alignItems: "center",
    padding: theme.space[6],
    backgroundColor: theme.colors.backgroundSecondary,
  },
  frame: {
    width: 344,
    padding: theme.space[5],
    backgroundColor: theme.colors.background,
  },
  scrollFrame: {
    width: 344,
    height: 560,
    padding: theme.space[4],
    backgroundColor: theme.colors.background,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
  },
  stack: {
    gap: theme.space[3],
  },
  subStepIndent: {
    marginLeft: theme.space[4],
    paddingLeft: theme.space[3],
    borderLeftWidth: theme.borderWidth.thick,
    borderLeftColor: theme.colors.backgroundTertiary,
  },
  row: {
    paddingVertical: theme.space[3],
    borderBottomWidth: theme.borderWidth.thin,
    borderBottomColor: theme.colors.backgroundTertiary,
  },
  rowTitle: {
    fontSize: theme.size.md,
    color: theme.colors.text,
    marginBottom: theme.space[1],
  },
  readout: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    color: theme.colors.textMuted,
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
  matrixCard: {
    width: 344,
    padding: theme.space[5],
  },
}));
