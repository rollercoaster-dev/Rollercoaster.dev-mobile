/**
 * Tests for the IconPicker component (trigger button + modal)
 *
 * Verifies the trigger button shows current selection, modal opens/closes,
 * search filtering, icon selection, weight selection, category browsing,
 * and accessibility requirements.
 */

import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../__tests__/test-utils";
import { IconPicker } from "../IconPicker";
import { POPULAR_ICON_NAMES } from "../iconIndex";

// Mock phosphor-react-native — each icon is a simple View with testID
jest.mock("phosphor-react-native", () => {
  const React = require("react");
  const { View, Text } = require("react-native");

  const createMockIcon = (name: string) => {
    const MockIcon: React.FC<{
      size?: number;
      weight?: string;
      color?: string;
      testID?: string;
    }> = ({ testID, ...props }) => (
      <View testID={testID ?? `icon-${name}`}>
        <Text>{name}</Text>
      </View>
    );
    MockIcon.displayName = name;
    return MockIcon;
  };

  // Create mock icons for all icons referenced in the registry
  const iconNames = [
    "Trophy",
    "Medal",
    "MedalMilitary",
    "Crown",
    "CrownSimple",
    "Star",
    "StarFour",
    "Sparkle",
    "Certificate",
    "SealCheck",
    "Seal",
    "ShieldCheck",
    "ShieldStar",
    "Flag",
    "FlagBanner",
    "FlagCheckered",
    "ThumbsUp",
    "HandFist",
    "Champagne",
    "Confetti",
    "Target",
    "Book",
    "BookOpen",
    "BookBookmark",
    "Books",
    "GraduationCap",
    "Student",
    "Chalkboard",
    "ChalkboardTeacher",
    "Brain",
    "Lightbulb",
    "LightbulbFilament",
    "Atom",
    "Flask",
    "TestTube",
    "MathOperations",
    "Exam",
    "Notebook",
    "PencilSimple",
    "Pen",
    "MagnifyingGlass",
    "Compass",
    "Globe",
    "Code",
    "CodeBlock",
    "Terminal",
    "TerminalWindow",
    "Bug",
    "BugBeetle",
    "GitBranch",
    "GitCommit",
    "GitMerge",
    "GitPullRequest",
    "Database",
    "CloudArrowUp",
    "Cpu",
    "Robot",
    "Wrench",
    "Gear",
    "GearSix",
    "Plugs",
    "Browsers",
    "Layout",
    "DeviceMobile",
    "Desktop",
    "Heart",
    "Heartbeat",
    "FirstAid",
    "Pill",
    "Barbell",
    "PersonSimpleRun",
    "PersonSimpleWalk",
    "Bicycle",
    "HandHeart",
    "YinYang",
    "SmileyWink",
    "Smiley",
    "SunHorizon",
    "Moon",
    "BowlFood",
    "AppleLogo",
    "PaintBrush",
    "Palette",
    "Pencil",
    "PaintRoller",
    "Camera",
    "FilmStrip",
    "VideoCamera",
    "MusicNote",
    "MusicNotes",
    "Guitar",
    "PianoKeys",
    "Microphone",
    "Scissors",
    "Cube",
    "Shapes",
    "MagicWand",
    "Aperture",
    "Tree",
    "Plant",
    "Flower",
    "FlowerLotus",
    "Leaf",
    "Sun",
    "CloudSun",
    "Mountains",
    "Waves",
    "Drop",
    "Fire",
    "Lightning",
    "Snowflake",
    "Rainbow",
    "PawPrint",
    "Bird",
    "Butterfly",
    "Fish",
    "ChatCircle",
    "ChatDots",
    "EnvelopeSimple",
    "Megaphone",
    "ShareNetwork",
    "Users",
    "UserCircle",
    "Handshake",
    "Chats",
    "Translate",
    "Presentation",
    "CurrencyDollar",
    "Coin",
    "Coins",
    "Wallet",
    "PiggyBank",
    "ChartLineUp",
    "ChartBar",
    "TrendUp",
    "Scales",
    "SoccerBall",
    "Basketball",
    "TennisBall",
    "Baseball",
    "Football",
    "SwimmingPool",
    "PersonSimpleBike",
    "Airplane",
    "MapPin",
    "Tent",
    "Backpack",
    "Binoculars",
    "House",
    "RocketLaunch",
    "Rocket",
    "X",
  ];

  const exports: Record<string, unknown> = {
    IconContext: React.createContext({}),
  };

  for (const name of iconNames) {
    exports[name] = createMockIcon(name);
  }

  return exports;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function openModal() {
  const trigger = screen.getByLabelText(/Selected icon:.*Tap to change/);
  fireEvent.press(trigger);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("IconPicker", () => {
  const defaultProps = {
    selectedIcon: "Trophy",
    selectedWeight: "regular" as const,
    onSelectIcon: jest.fn(),
    onSelectWeight: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -- Trigger button --

  describe("trigger button", () => {
    it("renders with current icon name in accessibility label", () => {
      renderWithProviders(<IconPicker {...defaultProps} />);

      const trigger = screen.getByLabelText(
        "Selected icon: Trophy. Tap to change",
      );
      expect(trigger).toBeOnTheScreen();
      expect(trigger.props.accessibilityRole).toBe("button");
    });

    it('shows "Tap to change icon" hint text', () => {
      renderWithProviders(<IconPicker {...defaultProps} />);

      expect(screen.getByText("Tap to change icon")).toBeOnTheScreen();
    });

    it("shows the icon label as display text", () => {
      renderWithProviders(
        <IconPicker {...defaultProps} selectedIcon="Crown" />,
      );

      // "Crown" appears as both trigger label text and mock icon text
      const elements = screen.getAllByText("Crown");
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it("opens modal when pressed", () => {
      renderWithProviders(<IconPicker {...defaultProps} />);

      // Modal content should not be visible before press
      expect(screen.queryByText("Choose Icon")).toBeNull();

      openModal();

      expect(screen.getByText("Choose Icon")).toBeOnTheScreen();
    });
  });

  // -- Modal content --

  describe("modal", () => {
    function renderAndOpen(overrides = {}) {
      renderWithProviders(<IconPicker {...defaultProps} {...overrides} />);
      openModal();
    }

    it('renders header with "Choose Icon" title', () => {
      renderAndOpen();
      expect(screen.getByText("Choose Icon")).toBeOnTheScreen();
    });

    it("renders close button that closes modal", () => {
      renderAndOpen();

      const closeButton = screen.getByLabelText("Close icon picker");
      expect(closeButton).toBeOnTheScreen();

      fireEvent.press(closeButton);

      // Modal content should be gone
      expect(screen.queryByText("Choose Icon")).toBeNull();
    });

    it("renders preview bar with selected icon info", () => {
      renderAndOpen();

      expect(
        screen.getByLabelText("Selected: Trophy, Regular"),
      ).toBeOnTheScreen();
    });

    it("renders search input with correct accessibility", () => {
      renderAndOpen();

      const searchInput = screen.getByLabelText("Search icons");
      expect(searchInput).toBeOnTheScreen();
      expect(searchInput.props.accessibilityRole).toBe("search");
    });

    it("renders weight selector with radio roles", () => {
      renderAndOpen();

      expect(screen.getByLabelText("Regular weight")).toBeOnTheScreen();
      expect(screen.getByLabelText("Bold weight")).toBeOnTheScreen();
      expect(screen.getByLabelText("Fill weight")).toBeOnTheScreen();
    });

    it("marks current weight as checked", () => {
      renderAndOpen({ selectedWeight: "bold" });

      const boldChip = screen.getByLabelText("Bold weight");
      expect(boldChip.props.accessibilityState?.checked).toBe(true);

      const regularChip = screen.getByLabelText("Regular weight");
      expect(regularChip.props.accessibilityState?.checked).toBe(false);
    });

    it("calls onSelectWeight when a weight segment is pressed", () => {
      const onSelectWeight = jest.fn();
      renderAndOpen({ onSelectWeight });

      fireEvent.press(screen.getByLabelText("Bold weight"));
      expect(onSelectWeight).toHaveBeenCalledWith("bold");
    });

    it("renders category tabs with tab roles", () => {
      renderAndOpen();

      expect(screen.getByLabelText("Achievement category")).toBeOnTheScreen();
      expect(screen.getByLabelText("Learning category")).toBeOnTheScreen();
      expect(screen.getByLabelText("Coding category")).toBeOnTheScreen();
    });

    it("shows popular icons by default", () => {
      renderAndOpen();

      const trophyButton = screen.getByLabelText("Trophy icon, selected");
      expect(trophyButton).toBeOnTheScreen();
    });

    it("calls onSelectIcon when an icon is pressed", () => {
      const onSelectIcon = jest.fn();
      renderAndOpen({ onSelectIcon });

      // Star is in the popular set
      const starButton = screen.getByLabelText("Star icon");
      fireEvent.press(starButton);
      expect(onSelectIcon).toHaveBeenCalledWith("Star");
    });

    it("marks selected icon with selected accessibility state", () => {
      renderAndOpen({ selectedIcon: "Trophy" });

      const trophyButton = screen.getByLabelText("Trophy icon, selected");
      expect(trophyButton.props.accessibilityState?.selected).toBe(true);
    });

    it("icon cells have accessibilityHint for double-tap", () => {
      renderAndOpen();

      const trophyButton = screen.getByLabelText("Trophy icon, selected");
      expect(trophyButton.props.accessibilityHint).toBe("Double tap to select");
    });

    it("filters icons when search query is entered", () => {
      renderAndOpen();

      const searchInput = screen.getByLabelText("Search icons");
      fireEvent.changeText(searchInput, "trophy");

      expect(screen.getByLabelText("Trophy icon, selected")).toBeOnTheScreen();
    });

    it("shows result count in search area", () => {
      renderAndOpen();

      // Default popular set count
      expect(screen.getByText(/\d+ icons/)).toBeOnTheScreen();
    });

    it("shows clear button when search has text", () => {
      renderAndOpen();

      const searchInput = screen.getByLabelText("Search icons");
      fireEvent.changeText(searchInput, "trophy");

      const clearButton = screen.getByLabelText("Clear search");
      expect(clearButton).toBeOnTheScreen();
    });

    it('shows "No icons found" for unmatched search', () => {
      renderAndOpen();

      const searchInput = screen.getByLabelText("Search icons");
      fireEvent.changeText(searchInput, "xyzzyplugh");

      expect(screen.getByText("No icons found")).toBeOnTheScreen();
    });

    it("each icon has an accessibility label with its name", () => {
      renderAndOpen();

      for (const iconName of POPULAR_ICON_NAMES.slice(0, 3)) {
        const label =
          iconName === defaultProps.selectedIcon
            ? `${iconName.replace(/([A-Z])/g, " $1").trim()} icon, selected`
            : `${iconName.replace(/([A-Z])/g, " $1").trim()} icon`;
        const button = screen.getByLabelText(label);
        expect(button).toBeOnTheScreen();
      }
    });
  });
});
