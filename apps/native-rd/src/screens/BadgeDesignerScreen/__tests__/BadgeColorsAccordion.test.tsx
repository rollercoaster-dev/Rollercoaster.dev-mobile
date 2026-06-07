/**
 * Tests for BadgeColorsAccordion — the tabbed Fill/Border/Frame/Icon picker.
 *
 * Covers tab visibility (Frame gated on `design.frame !== 'none'`), the
 * state redirect when the active tab disappears, sentinel + swatch +
 * custom-trigger callbacks per channel, and the icon contrast warning.
 */

import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { BadgeColorsAccordion } from "../BadgeColorsAccordion";
import {
  BadgeShape,
  BadgeFrame,
  BadgeIconWeight,
  BADGE_COLOR_THEME_SENTINEL,
  type BadgeDesign,
} from "../../../badges/types";

function createDesign(overrides: Partial<BadgeDesign> = {}): BadgeDesign {
  return {
    shape: BadgeShape.circle,
    frame: BadgeFrame.none,
    color: "#a78bfa",
    iconName: "Trophy",
    iconWeight: BadgeIconWeight.regular,
    title: "Test",
    centerMode: "icon" as const,
    ...overrides,
  };
}

function makeHandlers() {
  return {
    onChangeFill: jest.fn(),
    onChangeBorder: jest.fn(),
    onChangeFrame: jest.fn(),
    onChangeIcon: jest.fn(),
    onChangeIconDuotoneOpacity: jest.fn(),
    onOpenCustomPicker: jest.fn(),
  };
}

describe("BadgeColorsAccordion", () => {
  describe("tab visibility", () => {
    it("renders Fill, Border, and Icon tabs by default", () => {
      const handlers = makeHandlers();
      renderWithProviders(
        <BadgeColorsAccordion design={createDesign()} {...handlers} />,
      );
      expect(screen.getByLabelText("Fill")).toBeOnTheScreen();
      expect(screen.getByLabelText("Border")).toBeOnTheScreen();
      expect(screen.getByLabelText("Icon")).toBeOnTheScreen();
    });

    it("hides the Frame tab when design.frame === 'none'", () => {
      const handlers = makeHandlers();
      renderWithProviders(
        <BadgeColorsAccordion design={createDesign()} {...handlers} />,
      );
      expect(screen.queryByLabelText("Frame")).toBeNull();
    });

    it("shows the Frame tab when design.frame is set", () => {
      const handlers = makeHandlers();
      renderWithProviders(
        <BadgeColorsAccordion
          design={createDesign({ frame: BadgeFrame.boldBorder })}
          {...handlers}
        />,
      );
      expect(screen.getByLabelText("Frame")).toBeOnTheScreen();
    });
  });

  describe("tab switching", () => {
    it("switches body content when a tab header is pressed", () => {
      const handlers = makeHandlers();
      renderWithProviders(
        <BadgeColorsAccordion design={createDesign()} {...handlers} />,
      );
      // Initial tab is Fill — Border palette container is not present.
      expect(screen.queryByLabelText("Badge border color")).toBeNull();
      fireEvent.press(screen.getByLabelText("Border"));
      expect(screen.getByLabelText("Badge border color")).toBeOnTheScreen();
    });

    it("redirects to Border when the active Frame tab is removed", () => {
      const handlers = makeHandlers();
      const { rerender } = renderWithProviders(
        <BadgeColorsAccordion
          design={createDesign({ frame: BadgeFrame.boldBorder })}
          {...handlers}
        />,
      );
      // Activate the Frame tab, then drop the frame.
      fireEvent.press(screen.getByLabelText("Frame"));
      expect(screen.getByLabelText("Badge frame color")).toBeOnTheScreen();

      rerender(
        <BadgeColorsAccordion
          design={createDesign({ frame: BadgeFrame.none })}
          {...handlers}
        />,
      );
      // The derived tab renders Border in the same commit, before the effect
      // converges the stored tab state.
      expect(screen.queryByLabelText("Badge frame color")).toBeNull();
      expect(screen.getByLabelText("Badge border color")).toBeOnTheScreen();

      rerender(
        <BadgeColorsAccordion
          design={createDesign({ frame: BadgeFrame.boldBorder })}
          {...handlers}
        />,
      );
      // The stored tab also converges to Border, so restoring a frame does not
      // unexpectedly reopen the previously active Frame channel.
      expect(screen.getByLabelText("Badge border color")).toBeOnTheScreen();
      expect(screen.queryByLabelText("Badge frame color")).toBeNull();
    });
  });

  describe("border channel", () => {
    function openBorder() {
      fireEvent.press(screen.getByLabelText("Border"));
    }

    it("fires onChangeBorder with the theme sentinel when 'Match theme' is pressed", () => {
      const handlers = makeHandlers();
      renderWithProviders(
        <BadgeColorsAccordion
          design={createDesign({ borderColor: "#ff0000" })}
          {...handlers}
        />,
      );
      openBorder();
      fireEvent.press(screen.getByLabelText("Match theme"));
      expect(handlers.onChangeBorder).toHaveBeenCalledWith(
        BADGE_COLOR_THEME_SENTINEL,
      );
    });

    it("fires onChangeBorder with the accent hex when a swatch is pressed", () => {
      const handlers = makeHandlers();
      renderWithProviders(
        <BadgeColorsAccordion design={createDesign()} {...handlers} />,
      );
      openBorder();
      fireEvent.press(screen.getByLabelText("Orange border color"));
      expect(handlers.onChangeBorder).toHaveBeenCalledWith("#f97316");
    });

    it("fires onOpenCustomPicker('border') when the Custom… cell is pressed", () => {
      const handlers = makeHandlers();
      renderWithProviders(
        <BadgeColorsAccordion design={createDesign()} {...handlers} />,
      );
      openBorder();
      // Custom… cell uses the i18n `borderColor.custom` label inside the
      // Border channel — disambiguate by accessibilityHint to avoid the
      // identically-labelled Icon Custom cell when both panels mount.
      fireEvent.press(
        screen
          .getAllByLabelText("Custom")
          .find((node) =>
            /color picker/i.test(String(node.props.accessibilityHint ?? "")),
          )!,
      );
      expect(handlers.onOpenCustomPicker).toHaveBeenCalledWith("border");
    });
  });

  describe("frame channel", () => {
    it("fires onChangeFrame with the theme sentinel when 'Match theme' is pressed", () => {
      const handlers = makeHandlers();
      renderWithProviders(
        <BadgeColorsAccordion
          design={createDesign({ frame: BadgeFrame.boldBorder })}
          {...handlers}
        />,
      );
      fireEvent.press(screen.getByLabelText("Frame"));
      fireEvent.press(screen.getByLabelText("Match theme"));
      expect(handlers.onChangeFrame).toHaveBeenCalledWith(
        BADGE_COLOR_THEME_SENTINEL,
      );
    });

    it("fires onChangeFrame with the swatch hex when a swatch is pressed", () => {
      const handlers = makeHandlers();
      renderWithProviders(
        <BadgeColorsAccordion
          design={createDesign({ frame: BadgeFrame.boldBorder })}
          {...handlers}
        />,
      );
      fireEvent.press(screen.getByLabelText("Frame"));
      fireEvent.press(screen.getByLabelText("Mint frame color"));
      expect(handlers.onChangeFrame).toHaveBeenCalledWith("#34d399");
    });
  });

  describe("icon channel", () => {
    function openIcon() {
      fireEvent.press(screen.getByLabelText("Icon"));
    }

    it("fires onChangeIcon with the sentinel when 'Auto' is pressed", () => {
      const handlers = makeHandlers();
      renderWithProviders(
        <BadgeColorsAccordion
          design={createDesign({ iconColor: "#ff0000" })}
          {...handlers}
        />,
      );
      openIcon();
      fireEvent.press(screen.getByLabelText("Auto"));
      expect(handlers.onChangeIcon).toHaveBeenCalledWith(
        BADGE_COLOR_THEME_SENTINEL,
      );
    });

    it("fires onChangeIcon with the swatch hex when a swatch is pressed", () => {
      const handlers = makeHandlers();
      renderWithProviders(
        <BadgeColorsAccordion design={createDesign()} {...handlers} />,
      );
      openIcon();
      fireEvent.press(screen.getByLabelText("Purple icon color"));
      expect(handlers.onChangeIcon).toHaveBeenCalledWith("#a78bfa");
    });

    it.each([
      BadgeIconWeight.thin,
      BadgeIconWeight.light,
      BadgeIconWeight.regular,
      BadgeIconWeight.bold,
      BadgeIconWeight.fill,
    ])("hides opacity for %s icons", (iconWeight) => {
      renderWithProviders(
        <BadgeColorsAccordion
          design={createDesign({ iconWeight })}
          {...makeHandlers()}
        />,
      );
      openIcon();
      expect(screen.queryByLabelText("Duotone fill opacity")).toBeNull();
    });

    it("shows the fallback percentage and changes duotone opacity", () => {
      const handlers = makeHandlers();
      renderWithProviders(
        <BadgeColorsAccordion
          design={createDesign({ iconWeight: BadgeIconWeight.duotone })}
          {...handlers}
        />,
      );
      openIcon();
      expect(screen.getByTestId("duotone-opacity-value")).toHaveTextContent(
        "20%",
      );
      fireEvent(
        screen.getByLabelText("Duotone fill opacity"),
        "accessibilityAction",
        { nativeEvent: { actionName: "increment" } },
      );
      expect(handlers.onChangeIconDuotoneOpacity).toHaveBeenCalledWith(0.3);
    });

    it("displays the stored duotone percentage", () => {
      renderWithProviders(
        <BadgeColorsAccordion
          design={createDesign({
            iconWeight: BadgeIconWeight.duotone,
            iconDuotoneOpacity: 0.6,
          })}
          {...makeHandlers()}
        />,
      );
      openIcon();
      expect(screen.getByTestId("duotone-opacity-value")).toHaveTextContent(
        "60%",
      );
    });
  });

  describe("fill channel", () => {
    it("fires onChangeFill with the swatch hex when a swatch is pressed", () => {
      const handlers = makeHandlers();
      renderWithProviders(
        <BadgeColorsAccordion design={createDesign()} {...handlers} />,
      );
      // Fill is the initial tab — no need to switch.
      fireEvent.press(screen.getByLabelText("Orange color"));
      expect(handlers.onChangeFill).toHaveBeenCalledWith("#f97316");
    });
  });
});
