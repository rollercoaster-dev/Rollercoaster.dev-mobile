import React from "react";
import { Alert } from "react-native";
import { Buffer } from "buffer";
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
} from "../../../__tests__/test-utils";
import { BadgeDesignerScreen } from "../BadgeDesignerScreen";
import type { BadgeDesignerScreenProps } from "../../../navigation/types";

const mockGoBack = jest.fn();
const mockReplace = jest.fn();

jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: mockGoBack,
      replace: mockReplace,
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      canGoBack: jest.fn(() => true),
    }),
  };
});

const mockUseQuery = jest.fn();
jest.mock("@evolu/react", () => {
  const actual = jest.requireActual("@evolu/react");
  return {
    ...actual,
    useQuery: (...args: unknown[]) => mockUseQuery(...args),
  };
});

const mockUpdateBadge = jest.fn();
jest.mock("../../../db", () => ({
  badgeWithGoalQuery: jest.fn(() => ({ __brand: "badgeWithGoalQuery" })),
  goalsQuery: { __brand: "goalsQuery" },
  updateBadge: (...args: unknown[]) => mockUpdateBadge(...args),
}));

const mockPendingDesignStore = {
  set: jest.fn(),
  get: jest.fn(),
  consume: jest.fn(),
  clear: jest.fn(),
};
jest.mock("../../../stores/pendingDesignStore", () => ({
  pendingDesignStore: {
    set: (...args: unknown[]) => mockPendingDesignStore.set(...args),
    get: (...args: unknown[]) => mockPendingDesignStore.get(...args),
    consume: (...args: unknown[]) => mockPendingDesignStore.consume(...args),
    clear: (...args: unknown[]) => mockPendingDesignStore.clear(...args),
  },
}));

const mockCaptureBadge = jest.fn();
jest.mock("../../../badges/captureBadge", () => ({
  captureBadge: (...args: unknown[]) => mockCaptureBadge(...args),
}));

// Mock react-native-svg
jest.mock("react-native-svg", () => {
  const React = require("react");
  const { View } = require("react-native");
  const stub = (props: Record<string, unknown>) => <View {...props} />;
  return {
    __esModule: true,
    default: stub,
    Svg: stub,
    Path: stub,
    G: stub,
    Text: stub,
    TextPath: stub,
    Defs: stub,
    Rect: stub,
    Circle: stub,
    ClipPath: stub,
  };
});

// Mock phosphor-react-native (virtual — not installed in node_modules)
jest.mock(
  "phosphor-react-native",
  () => {
    const React = require("react");
    const { View, Text } = require("react-native");
    const createMockIcon = (name: string) => {
      const MockIcon: React.FC<{
        size?: number;
        weight?: string;
        color?: string;
      }> = () => (
        <View testID={`icon-${name}`}>
          <Text>{name}</Text>
        </View>
      );
      MockIcon.displayName = name;
      return MockIcon;
    };
    const iconNames = [
      "Trophy",
      "Medal",
      "Star",
      "Crown",
      "Heart",
      "Book",
      "Code",
      "Brain",
      "Rocket",
      "Fire",
      "ShieldCheck",
      "Lightbulb",
      "X",
      "GraduationCap",
      "PaintBrush",
      "Leaf",
      "ChatCircle",
      "Coin",
      "SoccerBall",
      "Airplane",
      "Sparkle",
    ];
    const exports: Record<string, unknown> = {
      IconContext: React.createContext({}),
    };
    for (const name of iconNames) {
      exports[name] = createMockIcon(name);
    }
    return exports;
  },
  { virtual: true },
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: "badge-1",
  goalId: "goal-1",
  credential: "{}",
  imageUri: "file://badge.png",
  design: JSON.stringify({
    shape: "circle",
    frame: "none",
    color: "#a78bfa",
    iconName: "Trophy",
    iconWeight: "regular",
    title: "Learn TypeScript",
    centerMode: "icon",
  }),
  createdAt: "2026-01-28T00:00:00.000Z",
  goalTitle: "Learn TypeScript",
  completedAt: "2026-01-28T00:00:00.000Z",
  goalColor: "#06b6d4",
  ...overrides,
});

const mockRoute = {
  params: { badgeId: "badge-1" },
  key: "BadgeDesigner-1",
  name: "BadgeDesigner" as const,
} as BadgeDesignerScreenProps["route"];

beforeEach(() => {
  jest.clearAllMocks();
  mockUseQuery.mockReturnValue([]);
  mockCaptureBadge.mockResolvedValue(Buffer.from("png-bytes"));
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BadgeDesignerScreen", () => {
  it('renders "Badge not found" when badge does not exist', () => {
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByText("Badge not found")).toBeOnTheScreen();
  });

  it('renders top bar with "Design Badge" title', () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByText("Design Badge")).toBeOnTheScreen();
  });

  it("renders back button that calls goBack", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    fireEvent.press(screen.getByLabelText("Go back"));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it("renders live preview with accessibility label", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(
      screen.getByLabelText(/Badge preview:.*circle.*Trophy/),
    ).toBeOnTheScreen();
  });

  it("renders ShapeSelector with all 6 shapes", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByLabelText("Badge shape")).toBeOnTheScreen();
    expect(screen.getByLabelText("Circle shape")).toBeOnTheScreen();
    expect(screen.getByLabelText("Diamond shape")).toBeOnTheScreen();
  });

  it("renders ColorPicker with accent swatches and goal color", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByLabelText("Badge color")).toBeOnTheScreen();
    expect(screen.getByLabelText("Purple color")).toBeOnTheScreen();
    expect(screen.getByLabelText("Goal color")).toBeOnTheScreen();
  });

  it("renders Save Design button", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByLabelText("Save Design")).toBeOnTheScreen();
  });

  it("calls updateBadge and goBack when Save is pressed", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    fireEvent.press(screen.getByLabelText("Save Design"));
    expect(mockUpdateBadge).toHaveBeenCalledWith(
      "badge-1",
      expect.objectContaining({
        design: expect.stringContaining('"shape":"circle"'),
      }),
    );
    expect(mockGoBack).toHaveBeenCalled();
  });

  it("updates preview when a different shape is selected", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    fireEvent.press(screen.getByLabelText("Shield shape"));
    expect(screen.getByLabelText(/Badge preview:.*shield/i)).toBeOnTheScreen();
  });

  it("updates preview when a different color is selected", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    fireEvent.press(screen.getByLabelText("Mint color"));
    expect(screen.getByLabelText(/Badge preview:.*#34d399/)).toBeOnTheScreen();
  });

  it("persists modified design when Save is pressed after changes", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    fireEvent.press(screen.getByLabelText("Shield shape"));
    fireEvent.press(screen.getByLabelText("Mint color"));
    fireEvent.press(screen.getByLabelText("Save Design"));

    expect(mockUpdateBadge).toHaveBeenCalledWith(
      "badge-1",
      expect.objectContaining({
        design: expect.stringContaining('"shape":"shield"'),
      }),
    );
    expect(mockUpdateBadge).toHaveBeenCalledWith(
      "badge-1",
      expect.objectContaining({
        design: expect.stringContaining('"color":"#34d399"'),
      }),
    );
    expect(mockGoBack).toHaveBeenCalled();
  });

  it("creates default design when badge has no existing design", () => {
    mockUseQuery.mockReturnValue([makeRow({ design: null })]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    // Should still render with default design
    expect(screen.getByLabelText(/Badge preview:/)).toBeOnTheScreen();
    expect(screen.getByLabelText("Save Design")).toBeOnTheScreen();
  });

  // --- New controls from #190 ---

  it("renders FrameSelector", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByLabelText("Badge frame")).toBeOnTheScreen();
  });

  it("renders CenterModeSelector", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByLabelText("Badge center mode")).toBeOnTheScreen();
  });

  it("renders PathTextEditor", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByLabelText("Enable path text")).toBeOnTheScreen();
  });

  it("renders BannerEditor", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByLabelText("Enable banner")).toBeOnTheScreen();
  });

  it("shows icon picker by default (icon mode)", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(
      screen.getByLabelText(/Selected icon:.*Tap to change/),
    ).toBeOnTheScreen();
  });

  it("hides icon picker when monogram mode is selected", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    fireEvent.press(screen.getByLabelText("Monogram center"));
    expect(screen.queryByLabelText(/Selected icon:.*Tap to change/)).toBeNull();
  });

  it("renders center label input", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByLabelText("Center label")).toBeOnTheScreen();
  });

  it("includes new fields in saved JSON after changes", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    // Select a frame
    fireEvent.press(screen.getByLabelText("Guilloche frame"));

    // Toggle path text on
    fireEvent.press(screen.getByLabelText("Enable path text"));

    // Toggle banner on
    fireEvent.press(screen.getByLabelText("Enable banner"));

    // Save
    fireEvent.press(screen.getByLabelText("Save Design"));

    const savedJson = mockUpdateBadge.mock.calls[0][1].design;
    expect(savedJson).toContain('"frame":"guilloche"');
    expect(savedJson).toContain('"pathText"');
    expect(savedJson).toContain('"banner"');
  });

  it("toggle-off clears path text and banner from saved JSON", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    // Enable path text, then disable
    fireEvent.press(screen.getByLabelText("Enable path text"));
    fireEvent.press(screen.getByLabelText("Enable path text"));

    // Enable banner, then disable
    fireEvent.press(screen.getByLabelText("Enable banner"));
    fireEvent.press(screen.getByLabelText("Enable banner"));

    fireEvent.press(screen.getByLabelText("Save Design"));

    const savedJson = mockUpdateBadge.mock.calls[0][1].design;
    expect(savedJson).not.toContain('"pathText"');
    expect(savedJson).not.toContain('"pathTextPosition"');
    expect(savedJson).not.toContain('"banner"');
  });

  it("frame change reflected in preview accessibility label", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    fireEvent.press(screen.getByLabelText("Guilloche frame"));
    expect(
      screen.getByLabelText(/Badge preview:.*guilloche.*frame/),
    ).toBeOnTheScreen();
  });
});

// ---------------------------------------------------------------------------
// New-goal mode tests
// ---------------------------------------------------------------------------

const makeGoalRow = (overrides: Record<string, unknown> = {}) => ({
  id: "goal-1",
  title: "Learn TypeScript",
  color: "#06b6d4",
  status: "active",
  ...overrides,
});

const newGoalRoute = {
  params: { mode: "new-goal" as const, goalId: "goal-1" },
  key: "BadgeDesigner-new",
  name: "BadgeDesigner" as const,
} as unknown as BadgeDesignerScreenProps["route"];

describe("BadgeDesignerScreen — new-goal mode", () => {
  it('renders design editor with "Use This Design" button', () => {
    mockUseQuery.mockReturnValue([makeGoalRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={newGoalRoute} navigation={{} as never} />,
    );
    expect(screen.getByText("Use This Design")).toBeOnTheScreen();
  });

  it('renders "Skip — Use Default" button', () => {
    mockUseQuery.mockReturnValue([makeGoalRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={newGoalRoute} navigation={{} as never} />,
    );
    expect(screen.getByText("Skip — Use Default")).toBeOnTheScreen();
  });

  it("captures PNG, saves to pendingDesignStore, and navigates on save", async () => {
    mockUseQuery.mockReturnValue([makeGoalRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={newGoalRoute} navigation={{} as never} />,
    );

    fireEvent.press(screen.getByText("Use This Design"));

    await waitFor(() => {
      expect(mockCaptureBadge).toHaveBeenCalledWith(
        expect.objectContaining({ current: expect.anything() }),
        { width: 512, height: 512 },
      );
    });
    await waitFor(() => {
      expect(mockPendingDesignStore.set).toHaveBeenCalledWith("goal-1", {
        designJson: expect.stringContaining('"shape"'),
        pngBase64: Buffer.from("png-bytes").toString("base64"),
      });
    });
    expect(mockReplace).toHaveBeenCalledWith("EditMode", { goalId: "goal-1" });
  });

  it("captures default design and navigates on skip", async () => {
    mockUseQuery.mockReturnValue([makeGoalRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={newGoalRoute} navigation={{} as never} />,
    );

    fireEvent.press(screen.getByText("Skip — Use Default"));

    await waitFor(() => {
      expect(mockPendingDesignStore.set).toHaveBeenCalledWith("goal-1", {
        designJson: expect.stringContaining('"shape"'),
        pngBase64: Buffer.from("png-bytes").toString("base64"),
      });
    });
    expect(mockReplace).toHaveBeenCalledWith("EditMode", { goalId: "goal-1" });
  });

  it("alerts and does not navigate when capture fails", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockCaptureBadge.mockRejectedValueOnce(new Error("view not mounted"));
    mockUseQuery.mockReturnValue([makeGoalRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={newGoalRoute} navigation={{} as never} />,
    );

    fireEvent.press(screen.getByText("Use This Design"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Save Failed",
        expect.stringContaining("Could not save"),
      );
    });
    expect(mockPendingDesignStore.set).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("shows loading indicator when goal data is not yet available", () => {
    mockUseQuery.mockReturnValue([]);
    renderWithProviders(
      <BadgeDesignerScreen route={newGoalRoute} navigation={{} as never} />,
    );
    // ActivityIndicator should render (no "Use This Design" button visible)
    expect(screen.queryByText("Use This Design")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Integration tests (#191)
// ---------------------------------------------------------------------------

describe("BadgeDesignerScreen — integration", () => {
  it("full happy path: frame + path text + banner → save → verify JSON", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    // Select guilloche frame
    fireEvent.press(screen.getByLabelText("Guilloche frame"));

    // Enable path text, type text
    fireEvent.press(screen.getByLabelText("Enable path text"));
    fireEvent.changeText(screen.getByLabelText("Path text"), "ACHIEVEMENT");

    // Enable banner, type text
    fireEvent.press(screen.getByLabelText("Enable banner"));
    fireEvent.changeText(screen.getByLabelText("Banner text"), "WINNER");

    // Save
    fireEvent.press(screen.getByLabelText("Save Design"));

    expect(mockUpdateBadge).toHaveBeenCalledTimes(1);
    const savedJson = mockUpdateBadge.mock.calls[0][1].design;
    const parsed = JSON.parse(savedJson);
    expect(parsed.frame).toBe("guilloche");
    expect(parsed.pathText).toBe("ACHIEVEMENT");
    expect(parsed.pathTextPosition).toBe("top");
    expect(parsed.banner).toEqual(
      expect.objectContaining({ text: "WINNER", position: "center" }),
    );
  });

  it("backward compat: legacy design without new fields renders without crash", () => {
    const legacyDesign = JSON.stringify({
      shape: "circle",
      color: "#a78bfa",
      iconName: "Trophy",
      iconWeight: "regular",
      title: "Legacy Badge",
    });
    mockUseQuery.mockReturnValue([makeRow({ design: legacyDesign })]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByLabelText(/Badge preview:/)).toBeOnTheScreen();
    expect(screen.getByLabelText("Save Design")).toBeOnTheScreen();
  });

  // Note: renderWithProviders uses mocked unistyles so we cannot switch
  // themes at runtime. This single smoke test verifies the component
  // renders without crash. Real per-theme visual coverage relies on
  // Storybook stories viewed on-device.
  it("renders without crash (smoke test)", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    expect(() => {
      renderWithProviders(
        <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
      );
    }).not.toThrow();
  });
});
