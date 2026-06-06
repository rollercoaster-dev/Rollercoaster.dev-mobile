/**
 * Tests for BadgeColorsAccordion — the tabbed Fill/Border/Frame/Icon picker.
 *
 * Covers tab visibility (Frame gated on `design.frame !== 'none'`), the
 * useEffect redirect when the active tab disappears, sentinel + swatch +
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
      // Frame body unmounts; Border body now visible from the useEffect redirect.
      expect(screen.queryByLabelText("Badge frame color")).toBeNull();
      expect(screen.getByLabelText("Badge border color")).toBeOnTheScreen();
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
  });

  describe("contrast warning", () => {
    it("renders when iconColor is an explicit hex with low contrast", () => {
      // Pure white icon on a pure white fill = ratio 1:1, fails AA 4.5:1.
      const handlers = makeHandlers();
      renderWithProviders(
        <BadgeColorsAccordion
          design={createDesign({ color: "#ffffff", iconColor: "#ffffff" })}
          {...handlers}
        />,
      );
      fireEvent.press(screen.getByLabelText("Icon"));
      expect(screen.getByTestId("icon-contrast-warning")).toBeOnTheScreen();
    });

    it("does not render when iconColor is the Auto sentinel", () => {
      const handlers = makeHandlers();
      renderWithProviders(
        <BadgeColorsAccordion
          design={createDesign({
            color: "#ffffff",
            iconColor: BADGE_COLOR_THEME_SENTINEL,
          })}
          {...handlers}
        />,
      );
      fireEvent.press(screen.getByLabelText("Icon"));
      expect(screen.queryByTestId("icon-contrast-warning")).toBeNull();
    });

    it("does not render when iconColor passes AA against the fill", () => {
      const handlers = makeHandlers();
      renderWithProviders(
        <BadgeColorsAccordion
          design={createDesign({ color: "#ffffff", iconColor: "#000000" })}
          {...handlers}
        />,
      );
      fireEvent.press(screen.getByLabelText("Icon"));
      expect(screen.queryByTestId("icon-contrast-warning")).toBeNull();
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
