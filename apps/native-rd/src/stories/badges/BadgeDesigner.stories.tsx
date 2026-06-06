import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { BadgeRenderer } from "../../badges/BadgeRenderer";
import { ShapeSelector } from "../../badges/ShapeSelector";
import { ColorPicker } from "../../badges/ColorPicker";
import { IconPicker } from "../../badges/IconPicker";
import { FrameSelector } from "../../badges/FrameSelector";
import { CenterModeSelector } from "../../badges/CenterModeSelector";
import { PathTextEditor } from "../../badges/PathTextEditor";
import { BannerEditor } from "../../badges/BannerEditor";
import { CollapsibleSection } from "../../components/CollapsibleSection";
import {
  BadgeShape,
  BadgeFrame,
  BadgeIconWeight,
  BadgeCenterMode,
  PathTextPosition,
  BannerPosition,
  createDefaultBadgeDesign,
} from "../../badges/types";
import type { BadgeDesign } from "../../badges/types";
import { BOTTOM_LABEL_INPUT_MAX_CHARS } from "../../badges/text/BottomLabel";
import { BADGE_CANVAS_BACKGROUND } from "../../badges/constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDesign(overrides: Partial<BadgeDesign> = {}): BadgeDesign {
  return {
    ...createDefaultBadgeDesign("Sample Badge"),
    ...overrides,
  };
}

type AccordionSectionId =
  | "shape"
  | "frame"
  | "center"
  | "colors"
  | "inscriptions";

// ---------------------------------------------------------------------------
// Interactive composer — mirrors BadgeDesignerScreen's single-open accordion
// (section order Shape → Frame → Center → Colors → Inscriptions; opening
// any closed section replaces the current one; pressing the open header
// collapses it, leaving every section closed). Storybook callers don't have
// the screen's i18n provider, so section titles and verbs are passed as
// plain strings here — the production screen sources them from the
// `badgeDesigner.accordion.*` namespace.
// ---------------------------------------------------------------------------

function BadgeDesignerComposer({
  initialDesign,
  goalColor,
}: {
  initialDesign: BadgeDesign;
  goalColor?: string;
}) {
  const [design, setDesign] = useState(initialDesign);
  const [expandedSection, setExpandedSection] =
    useState<AccordionSectionId | null>("shape");

  const handleSection = (id: AccordionSectionId) => (next: boolean) => {
    setExpandedSection(next ? id : null);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.previewContainer}>
          <BadgeRenderer design={design} size={160} />
        </View>

        <CollapsibleSection
          title="Shape"
          variant="card"
          summary={design.shape}
          expanded={expandedSection === "shape"}
          onExpandedChange={handleSection("shape")}
        >
          <ShapeSelector
            selectedShape={design.shape}
            onSelectShape={(shape) => setDesign((prev) => ({ ...prev, shape }))}
            accentColor={design.color}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Frame"
          variant="card"
          summary={design.frame ?? "none"}
          expanded={expandedSection === "frame"}
          onExpandedChange={handleSection("frame")}
        >
          <FrameSelector
            selectedFrame={design.frame}
            onSelectFrame={(frame) => setDesign((prev) => ({ ...prev, frame }))}
            accentColor={design.color}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Center"
          variant="card"
          summary={
            design.centerMode === BadgeCenterMode.icon
              ? `Icon · ${design.iconName}`
              : design.monogram
                ? `Monogram "${design.monogram}"`
                : "Monogram"
          }
          expanded={expandedSection === "center"}
          onExpandedChange={handleSection("center")}
        >
          <View style={styles.sectionStack}>
            <CenterModeSelector
              selectedMode={design.centerMode}
              monogram={design.monogram ?? ""}
              onSelectMode={(centerMode) =>
                setDesign((prev) => ({ ...prev, centerMode }))
              }
              onChangeMonogram={(monogram: string) =>
                setDesign((prev) => ({ ...prev, monogram }))
              }
              accentColor={design.color}
            />
            {design.centerMode === BadgeCenterMode.icon && (
              <IconPicker
                selectedIcon={design.iconName}
                selectedWeight={design.iconWeight}
                onSelectIcon={(iconName) =>
                  setDesign((prev) => ({ ...prev, iconName }))
                }
                onSelectWeight={(iconWeight) =>
                  setDesign((prev) => ({ ...prev, iconWeight }))
                }
                accentColor={design.color}
              />
            )}
          </View>
        </CollapsibleSection>

        <CollapsibleSection
          title="Colors"
          variant="card"
          summary={design.color === goalColor ? "Goal color" : design.color}
          expanded={expandedSection === "colors"}
          onExpandedChange={handleSection("colors")}
        >
          <ColorPicker
            selectedColor={design.color}
            onSelectColor={(color) => setDesign((prev) => ({ ...prev, color }))}
            goalColor={goalColor}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Inscriptions"
          variant="card"
          summary={
            [
              design.bottomLabel ? "Label" : null,
              design.pathText !== undefined ? "Path" : null,
              design.banner != null ? "Banner" : null,
            ]
              .filter(Boolean)
              .join(" · ") || "None"
          }
          expanded={expandedSection === "inscriptions"}
          onExpandedChange={handleSection("inscriptions")}
        >
          <View style={styles.sectionStack}>
            <TextInput
              accessibilityLabel="Bottom label"
              value={design.bottomLabel ?? ""}
              onChangeText={(bottomLabel) =>
                setDesign((prev) => ({ ...prev, bottomLabel }))
              }
              maxLength={BOTTOM_LABEL_INPUT_MAX_CHARS}
              placeholder="Bottom label"
              style={styles.bottomLabelInput}
            />
            <PathTextEditor
              enabled={design.pathText !== undefined}
              text={design.pathText ?? ""}
              textBottom={design.pathTextBottom ?? ""}
              position={design.pathTextPosition ?? PathTextPosition.top}
              shape={design.shape}
              goalTitle={design.title}
              onToggle={(enabled) =>
                setDesign((prev) => ({
                  ...prev,
                  pathText: enabled ? "" : undefined,
                  pathTextPosition: enabled ? PathTextPosition.top : undefined,
                  pathTextBottom: enabled ? prev.pathTextBottom : undefined,
                }))
              }
              onChangeText={(pathText) =>
                setDesign((prev) => ({ ...prev, pathText }))
              }
              onChangeTextBottom={(pathTextBottom) =>
                setDesign((prev) => ({ ...prev, pathTextBottom }))
              }
              onChangePosition={(pathTextPosition) =>
                setDesign((prev) => ({ ...prev, pathTextPosition }))
              }
              accentColor={design.color}
            />
            <BannerEditor
              enabled={design.banner != null}
              text={design.banner?.text ?? ""}
              position={design.banner?.position ?? BannerPosition.top}
              onToggle={(enabled) =>
                setDesign((prev) => ({
                  ...prev,
                  banner: enabled
                    ? { text: "", position: BannerPosition.top }
                    : undefined,
                }))
              }
              onChangeText={(text) =>
                setDesign((prev) => ({
                  ...prev,
                  banner: {
                    ...(prev.banner ?? {
                      text: "",
                      position: BannerPosition.top,
                    }),
                    text,
                  },
                }))
              }
              onChangePosition={(position) =>
                setDesign((prev) => ({
                  ...prev,
                  banner: {
                    ...(prev.banner ?? {
                      text: "",
                      position: BannerPosition.top,
                    }),
                    position,
                  },
                }))
              }
              accentColor={design.color}
            />
          </View>
        </CollapsibleSection>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: "Badges/BadgeDesigner",
};

export default meta;
type Story = StoryObj;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const WithAllControls: Story = {
  render: () => (
    <BadgeDesignerComposer
      initialDesign={makeDesign({
        shape: BadgeShape.shield,
        frame: BadgeFrame.guilloche,
        color: "#06b6d4",
        iconName: "Trophy",
        iconWeight: BadgeIconWeight.bold,
        centerMode: BadgeCenterMode.monogram,
        monogram: "JC",
        bottomLabel: "EXPERT",
        pathText: "ACHIEVEMENT",
        pathTextPosition: PathTextPosition.both,
        pathTextBottom: "EARNED 2026",
        banner: { text: "WINNER", position: BannerPosition.top },
        frameParams: {
          variant: 0,
          stepCount: 8,
          evidenceCount: 5,
          daysToComplete: 60,
          evidenceTypes: 3,
        },
      })}
    />
  ),
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.space[4],
    gap: theme.space[3],
    alignItems: "stretch",
  },
  previewContainer: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.space[4],
    borderRadius: theme.radius.sm,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    backgroundColor: BADGE_CANVAS_BACKGROUND,
  },
  sectionStack: {
    gap: theme.space[3],
  },
  bottomLabelInput: {
    minHeight: 44,
    paddingHorizontal: theme.space[3],
    borderWidth: theme.borderWidth.medium,
    borderRadius: 0,
    ...theme.textStyles.body,
    fontWeight: "600" as const,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
}));
