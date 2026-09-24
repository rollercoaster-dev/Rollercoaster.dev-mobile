import React from "react";
import { StyleSheet } from "react-native";
import { renderWithProviders, screen } from "./test-utils";
import { mockTheme } from "./mocks/unistyles";
import { composeTheme, themes } from "../themes/compose";
import { styles as focusStyles } from "../components/FocusCurrentTaskCard/FocusCurrentTaskCard.styles";
import { GoalsCockpit } from "../screens/GoalsScreen/GoalsCockpit";
import { styles as cockpitStyles } from "../screens/GoalsScreen/GoalsCockpit.styles";
import { styles as badgeStyles } from "../screens/BadgesScreen/BadgesWall.styles";
import {
  styles as thumbStyles,
  VIEWER_STRIP_THUMB_WIDTH,
} from "../components/ViewerStripThumb/ViewerStripThumb.styles";

describe("essential text follows typography preferences", () => {
  it.each([
    ["dyslexia", "Lexend"],
    ["lowVision", "Atkinson Hyperlegible"],
  ] as const)(
    "carries the %s reading font through affected UI",
    (variant, family) => {
      const theme = composeTheme("light", variant);
      let focus!: typeof focusStyles;
      let cockpit!: typeof cockpitStyles;
      let badge!: typeof badgeStyles;
      let thumb!: typeof thumbStyles;
      jest.isolateModules(() => {
        const { StyleSheet: unistyles } =
          require("react-native-unistyles") as typeof import("react-native-unistyles");
        unistyles.configure({ themes: { ...themes, "light-default": theme } });
        focus = (
          require("../components/FocusCurrentTaskCard/FocusCurrentTaskCard.styles") as {
            styles: typeof focusStyles;
          }
        ).styles;
        cockpit = (
          require("../screens/GoalsScreen/GoalsCockpit.styles") as {
            styles: typeof cockpitStyles;
          }
        ).styles;
        badge = (
          require("../screens/BadgesScreen/BadgesWall.styles") as {
            styles: typeof badgeStyles;
          }
        ).styles;
        thumb = (
          require("../components/ViewerStripThumb/ViewerStripThumb.styles") as {
            styles: typeof thumbStyles;
          }
        ).styles;
      });

      expect(focus.bodyText.fontFamily).toBe(family);
      expect(focus.primaryCtaText.fontFamily).toBe(family);
      expect(cockpit.overline.fontFamily).toBe(family);
      expect(badge.emptyBody.fontFamily).toBe(family);
      expect(badge.spotlightDate.fontFamily).toBe(family);
      expect(thumb.label.fontFamily).toBe(family);
      for (const label of [
        focus.metadataText,
        cockpit.sectionLabel,
        badge.spotlightDate,
        thumb.label,
      ]) {
        expect(label.fontSize).toBeGreaterThanOrEqual(theme.size.sm);
      }
      if (variant === "dyslexia") {
        expect(focus.title.lineHeight / focus.title.fontSize).toBeGreaterThan(
          themes["light-default"].textStyles.taskTitle.lineHeight /
            themes["light-default"].textStyles.taskTitle.fontSize,
        );
      }
    },
  );

  it("gives Focus body and action text the reading font and task titles multiline spacing", () => {
    const title = StyleSheet.flatten(focusStyles.title);
    const body = StyleSheet.flatten(focusStyles.bodyText);
    const action = StyleSheet.flatten(focusStyles.primaryCtaText);
    const metadata = StyleSheet.flatten(focusStyles.metadataText);

    expect(title.fontFamily).toBe(mockTheme.fontFamily.headline);
    expect(title.lineHeight).toBeGreaterThan(title.fontSize! * 1.2);
    expect(body.fontFamily).toBe(mockTheme.fontFamily.body);
    expect(body.fontSize).toBeGreaterThanOrEqual(mockTheme.size.md);
    expect(action.fontFamily).toBe(mockTheme.fontFamily.body);
    expect(metadata.fontSize).toBeGreaterThanOrEqual(mockTheme.size.sm);
  });

  it("keeps a long cockpit goal identity readable instead of truncating a tiny overline", () => {
    const title = "Learn accessible interface design with long study notes";
    renderWithProviders(
      <GoalsCockpit
        hero={{
          id: "g1",
          title,
          nextStepTitle: "Read the complete typography guidance",
          progress: 0,
          stepsCompleted: 0,
          stepsTotal: 1,
        }}
        keepWarm={[]}
        onStartResume={jest.fn()}
        onOpenGoal={jest.fn()}
        onNewGoal={jest.fn()}
        onDeleteGoal={jest.fn()}
        heroIsPinned={false}
        onPinGoal={jest.fn()}
        onUnpinGoal={jest.fn()}
      />,
    );
    const context = screen.getByText(/Learn accessible interface design/);
    expect(context.props.numberOfLines).toBeUndefined();
    expect(
      StyleSheet.flatten(context.props.style).fontSize,
    ).toBeGreaterThanOrEqual(mockTheme.size.sm);
    expect(
      StyleSheet.flatten(cockpitStyles.sectionLabel).fontSize,
    ).toBeGreaterThanOrEqual(mockTheme.size.sm);
  });

  it("uses readable badge wall body and metadata sizes", () => {
    const body = StyleSheet.flatten(badgeStyles.emptyBody);
    const overline = StyleSheet.flatten(badgeStyles.spotlightOverline);
    const date = StyleSheet.flatten(badgeStyles.spotlightDate);
    expect(body.fontSize).toBeGreaterThanOrEqual(mockTheme.size.md);
    expect(body.fontFamily).toBe(mockTheme.fontFamily.body);
    expect(overline.fontSize).toBeGreaterThanOrEqual(mockTheme.size.sm);
    expect(date.fontSize).toBeGreaterThanOrEqual(mockTheme.size.sm);
  });

  it("makes evidence titles readable inside a tile large enough for two lines", () => {
    const label = StyleSheet.flatten(thumbStyles.label);
    const tile = thumbStyles.container(false);
    expect(label.fontSize).toBeGreaterThanOrEqual(mockTheme.size.sm);
    expect(label.fontFamily).toBe(mockTheme.fontFamily.body);
    expect(VIEWER_STRIP_THUMB_WIDTH).toBeGreaterThanOrEqual(96);
    expect(tile.minHeight).toBeGreaterThanOrEqual(96);
  });
});
