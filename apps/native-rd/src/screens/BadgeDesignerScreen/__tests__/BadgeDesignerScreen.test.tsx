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
import { i18n } from "../../../i18n";
import type {
  BadgeShape,
  BadgeFrame,
  BadgeCenterMode,
} from "../../../badges/types";
import type { AccentColorId } from "../../../badges/ColorPicker";

// The screen now renders its controls inside a single-open accordion.
// Shape opens on entry; every other section must be opened explicitly before
// its controls become interactive. This helper translates a section id into
// the CollapsibleSection's header a11y label and taps it.
const openSection = (
  id: "shape" | "frame" | "center" | "colors" | "inscriptions",
) => {
  const title = i18n.t(`badgeDesigner:accordion.sections.${id}`);
  const expandA11y = i18n.t("badgeDesigner:accordion.expandA11y");
  fireEvent.press(screen.getByLabelText(`${title}, ${expandA11y}`));
};

const shapeLabel = (id: BadgeShape) =>
  i18n.t("badgeDesigner:shape.optionA11y", {
    label: i18n.t(`badgeDesigner:shape.options.${id}`),
  });
const colorLabel = (id: AccentColorId) =>
  i18n.t("badgeDesigner:color.optionA11y", {
    label: i18n.t(`badgeDesigner:color.options.${id}`),
  });
const frameLabel = (id: BadgeFrame) =>
  i18n.t("badgeDesigner:frame.optionA11y", {
    label: i18n.t(`badgeDesigner:frame.options.${id}`),
  });
const centerLabel = (id: BadgeCenterMode) =>
  i18n.t("badgeDesigner:center.optionA11y", {
    label: i18n.t(`badgeDesigner:center.options.${id}`),
  });

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
const mockUpdateGoal = jest.fn();
jest.mock("../../../db", () => ({
  badgeWithGoalQuery: jest.fn(() => ({ __brand: "badgeWithGoalQuery" })),
  goalsQuery: { __brand: "goalsQuery" },
  updateBadge: (...args: unknown[]) => mockUpdateBadge(...args),
  updateGoal: (...args: unknown[]) => mockUpdateGoal(...args),
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
  getCaptureDimensions: () => ({ width: 512, height: 512 }),
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

// IconPickerModal pulls in react-native's `Modal`, whose lazy native-module
// require fails when triggered mid-test (after a section's first expand)
// instead of during the initial render. These screen tests assert on the
// IconPicker trigger button, not on modal internals, so a stub keeps the
// Icon mode subtree mountable.
jest.mock("../../../badges/IconPickerModal", () => ({
  IconPickerModal: () => null,
}));

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
      "ArrowLeft",
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
    expect(
      screen.getByText(i18n.t("badgeDesigner:fallback.badgeNotFound")),
    ).toBeOnTheScreen();
  });

  it('renders top bar with "Design Badge" title', () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByText(i18n.t("badgeDesigner:title"))).toBeOnTheScreen();
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
    expect(
      screen.getByLabelText(i18n.t("badgeDesigner:shape.a11y")),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText(shapeLabel("circle"))).toBeOnTheScreen();
    expect(screen.getByLabelText(shapeLabel("diamond"))).toBeOnTheScreen();
  });

  it("renders ColorPicker with accent swatches and goal color", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    openSection("colors");
    expect(
      screen.getByLabelText(i18n.t("badgeDesigner:color.a11y")),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText(colorLabel("purple"))).toBeOnTheScreen();
    expect(screen.getByLabelText(colorLabel("goal"))).toBeOnTheScreen();
  });

  it("renders Save Design button", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(
      screen.getByLabelText(i18n.t("badgeDesigner:actions.save")),
    ).toBeOnTheScreen();
  });

  it("calls updateBadge and goBack when Save is pressed", async () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    fireEvent.press(
      screen.getByLabelText(i18n.t("badgeDesigner:actions.save")),
    );
    // updateBadge runs after the capture promise resolves (capture-first
    // ordering keeps the badge row and PNG in sync on capture failure).
    await waitFor(() =>
      expect(mockUpdateBadge).toHaveBeenCalledWith(
        "badge-1",
        expect.objectContaining({
          design: expect.stringContaining('"shape":"circle"'),
        }),
      ),
    );
    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
  });

  it("captures PNG, writes pendingDesignStore entry on save (for downstream rebake)", async () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    mockCaptureBadge.mockResolvedValue(Buffer.from("redesigned-png-bytes"));
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    fireEvent.press(
      screen.getByLabelText(i18n.t("badgeDesigner:actions.save")),
    );

    await waitFor(() => expect(mockPendingDesignStore.set).toHaveBeenCalled());
    expect(mockPendingDesignStore.set).toHaveBeenCalledWith(
      "goal-1",
      expect.objectContaining({
        designJson: expect.stringContaining('"shape":"circle"'),
        pngBase64: Buffer.from("redesigned-png-bytes").toString("base64"),
      }),
    );
    expect(mockGoBack).toHaveBeenCalled();
  });

  it("fails loud (alerts) and does not navigate back when redesign-save capture fails", async () => {
    // Without a fresh capture the rebake would silently embed the new
    // credential into the previous design's PNG. Show an alert and keep the
    // user in the designer so they can retry — mirrors the new-goal-mode
    // saveAndNavigate pattern. Also: capture happens before updateBadge,
    // so a capture failure must NOT have updated the badge row (otherwise
    // the stored design and image drift apart on back-out).
    mockUseQuery.mockReturnValue([makeRow()]);
    mockCaptureBadge.mockRejectedValue(new Error("capture timeout"));
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    fireEvent.press(
      screen.getByLabelText(i18n.t("badgeDesigner:actions.save")),
    );

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        i18n.t("badgeDesigner:errors.saveFailedTitle"),
        expect.stringContaining("Could not capture"),
      ),
    );
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockPendingDesignStore.set).not.toHaveBeenCalled();
    expect(mockUpdateBadge).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("guards Save against double-tap (only one updateBadge + capture per click run)", async () => {
    // Async handleSave: without an isSaving guard, two rapid taps would
    // launch two captures, write two pendingDesignStore entries, and call
    // goBack twice.
    mockUseQuery.mockReturnValue([makeRow()]);
    let resolveCapture: ((buf: Buffer) => void) | undefined;
    mockCaptureBadge.mockImplementation(
      () =>
        new Promise<Buffer>((resolve) => {
          resolveCapture = resolve;
        }),
    );
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    const saveBtn = screen.getByLabelText(i18n.t("badgeDesigner:actions.save"));
    fireEvent.press(saveBtn);
    fireEvent.press(saveBtn);
    fireEvent.press(saveBtn);

    expect(mockCaptureBadge).toHaveBeenCalledTimes(1);
    resolveCapture?.(Buffer.from("png-bytes"));
    await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1));
    expect(mockUpdateBadge).toHaveBeenCalledTimes(1);
    expect(mockPendingDesignStore.set).toHaveBeenCalledTimes(1);
  });

  it("updates preview when a different shape is selected", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    fireEvent.press(screen.getByLabelText(shapeLabel("shield")));
    expect(screen.getByLabelText(/Badge preview:.*shield/i)).toBeOnTheScreen();
  });

  it("updates preview when a different color is selected", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    openSection("colors");
    fireEvent.press(screen.getByLabelText(colorLabel("mint")));
    expect(screen.getByLabelText(/Badge preview:.*#34d399/)).toBeOnTheScreen();
  });

  it("persists modified design when Save is pressed after changes", async () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    fireEvent.press(screen.getByLabelText(shapeLabel("shield")));
    openSection("colors");
    fireEvent.press(screen.getByLabelText(colorLabel("mint")));
    fireEvent.press(
      screen.getByLabelText(i18n.t("badgeDesigner:actions.save")),
    );

    // updateBadge runs after capture resolves (capture-first ordering).
    await waitFor(() =>
      expect(mockUpdateBadge).toHaveBeenCalledWith(
        "badge-1",
        expect.objectContaining({
          design: expect.stringContaining('"shape":"shield"'),
        }),
      ),
    );
    expect(mockUpdateBadge).toHaveBeenCalledWith(
      "badge-1",
      expect.objectContaining({
        design: expect.stringContaining('"color":"#34d399"'),
      }),
    );
    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
  });

  it("creates default design when badge has no existing design", () => {
    mockUseQuery.mockReturnValue([makeRow({ design: null })]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    // Should still render with default design
    expect(screen.getByLabelText(/Badge preview:/)).toBeOnTheScreen();
    expect(
      screen.getByLabelText(i18n.t("badgeDesigner:actions.save")),
    ).toBeOnTheScreen();
  });

  // --- New controls from #190 ---

  it("renders FrameSelector", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    openSection("frame");
    expect(
      screen.getByLabelText(i18n.t("badgeDesigner:frame.a11y")),
    ).toBeOnTheScreen();
  });

  it("renders CenterModeSelector", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    openSection("center");
    expect(
      screen.getByLabelText(i18n.t("badgeDesigner:center.a11y")),
    ).toBeOnTheScreen();
  });

  it("renders PathTextEditor", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    openSection("inscriptions");
    expect(
      screen.getByLabelText(i18n.t("badgeDesigner:pathText.toggleA11y")),
    ).toBeOnTheScreen();
  });

  it("renders BannerEditor", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    openSection("inscriptions");
    expect(
      screen.getByLabelText(i18n.t("badgeDesigner:banner.toggleA11y")),
    ).toBeOnTheScreen();
  });

  it("shows icon picker by default (icon mode)", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    openSection("center");
    expect(
      screen.getByLabelText(/Selected icon:.*Tap to change/),
    ).toBeOnTheScreen();
  });

  it("hides icon picker when monogram mode is selected", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    openSection("center");
    fireEvent.press(screen.getByLabelText(centerLabel("monogram")));
    expect(screen.queryByLabelText(/Selected icon:.*Tap to change/)).toBeNull();
  });

  it("renders bottom label input", () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    openSection("inscriptions");
    expect(
      screen.getByLabelText(i18n.t("badgeDesigner:bottomLabel.a11y")),
    ).toBeOnTheScreen();
  });

  it("includes new fields in saved JSON after changes", async () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    // Select a frame
    openSection("frame");
    fireEvent.press(screen.getByLabelText(frameLabel("guilloche")));

    // Toggle path text on
    openSection("inscriptions");
    fireEvent.press(
      screen.getByLabelText(i18n.t("badgeDesigner:pathText.toggleA11y")),
    );

    // Toggle banner on (Inscriptions is already open)
    fireEvent.press(
      screen.getByLabelText(i18n.t("badgeDesigner:banner.toggleA11y")),
    );

    // Save (updateBadge runs after capture resolves — capture-first order).
    fireEvent.press(
      screen.getByLabelText(i18n.t("badgeDesigner:actions.save")),
    );
    await waitFor(() => expect(mockUpdateBadge).toHaveBeenCalled());

    const savedJson = mockUpdateBadge.mock.calls[0][1].design;
    expect(savedJson).toContain('"frame":"guilloche"');
    expect(savedJson).toContain('"pathText"');
    expect(savedJson).toContain('"banner"');
  });

  it("toggle-off clears path text and banner from saved JSON", async () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    openSection("inscriptions");

    // Enable path text, then disable
    fireEvent.press(
      screen.getByLabelText(i18n.t("badgeDesigner:pathText.toggleA11y")),
    );
    fireEvent.press(
      screen.getByLabelText(i18n.t("badgeDesigner:pathText.toggleA11y")),
    );

    // Enable banner, then disable
    fireEvent.press(
      screen.getByLabelText(i18n.t("badgeDesigner:banner.toggleA11y")),
    );
    fireEvent.press(
      screen.getByLabelText(i18n.t("badgeDesigner:banner.toggleA11y")),
    );

    fireEvent.press(
      screen.getByLabelText(i18n.t("badgeDesigner:actions.save")),
    );
    await waitFor(() => expect(mockUpdateBadge).toHaveBeenCalled());

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

    openSection("frame");
    fireEvent.press(screen.getByLabelText(frameLabel("guilloche")));
    expect(
      screen.getByLabelText(/Badge preview:.*guilloche.*frame/),
    ).toBeOnTheScreen();
  });

  // ── TDD: bugs the user reported ──────────────────────────────────────
  // FrameOverlay returns null when `params` is undefined — see
  // FrameOverlay.test.tsx:56-66. So selecting a frame in the designer
  // without also setting `frameParams` produces a design that renders no
  // border at all. The designer currently ships exactly that bug:
  // handleFrameChange (BadgeDesignerScreen.tsx:119-124) sets only `frame`.
  // useFrameParamsForGoal exists for this purpose but is never wired in.
  it("attaches frameParams when a non-none frame is selected", async () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    openSection("frame");
    fireEvent.press(screen.getByLabelText(frameLabel("guilloche")));
    fireEvent.press(
      screen.getByLabelText(i18n.t("badgeDesigner:actions.save")),
    );
    await waitFor(() => expect(mockUpdateBadge).toHaveBeenCalled());

    const savedJson = mockUpdateBadge.mock.calls[0][1].design as string;
    const parsed = JSON.parse(savedJson);
    expect(parsed.frame).toBe("guilloche");
    // Without frameParams, FrameOverlay short-circuits and no frame renders.
    expect(parsed.frameParams).toBeDefined();
    expect(parsed.frameParams).toEqual(
      expect.objectContaining({ variant: expect.any(Number) }),
    );
  });

  it("clears frameParams when frame is set back to none", async () => {
    mockUseQuery.mockReturnValue([
      makeRow({
        design: JSON.stringify({
          shape: "circle",
          frame: "boldBorder",
          frameParams: {
            variant: 0,
            stepCount: 3,
            evidenceCount: 5,
            daysToComplete: 30,
            evidenceTypes: 3,
            stepNames: ["A", "B", "C"],
          },
          color: "#a78bfa",
          iconName: "Trophy",
          iconWeight: "regular",
          title: "Test",
          centerMode: "icon",
        }),
      }),
    ]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    openSection("frame");
    fireEvent.press(screen.getByLabelText(frameLabel("none")));
    fireEvent.press(
      screen.getByLabelText(i18n.t("badgeDesigner:actions.save")),
    );
    await waitFor(() => expect(mockUpdateBadge).toHaveBeenCalled());

    const savedJson = mockUpdateBadge.mock.calls[0][1].design as string;
    const parsed = JSON.parse(savedJson);
    expect(parsed.frame).toBe("none");
    // No frame ⇒ frameParams should be dropped (no orphan params).
    expect(parsed.frameParams).toBeUndefined();
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
    expect(
      screen.getByText(i18n.t("badgeDesigner:actions.useThisDesign")),
    ).toBeOnTheScreen();
  });

  it('renders "Skip — Use Default" button', () => {
    mockUseQuery.mockReturnValue([makeGoalRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={newGoalRoute} navigation={{} as never} />,
    );
    expect(
      screen.getByText(i18n.t("badgeDesigner:actions.skipDefault")),
    ).toBeOnTheScreen();
  });

  it("captures PNG, saves to pendingDesignStore, and navigates on save", async () => {
    mockUseQuery.mockReturnValue([makeGoalRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={newGoalRoute} navigation={{} as never} />,
    );

    fireEvent.press(
      screen.getByText(i18n.t("badgeDesigner:actions.useThisDesign")),
    );

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

    fireEvent.press(
      screen.getByText(i18n.t("badgeDesigner:actions.skipDefault")),
    );

    await waitFor(() => {
      expect(mockPendingDesignStore.set).toHaveBeenCalledWith("goal-1", {
        designJson: expect.stringContaining('"shape"'),
        pngBase64: Buffer.from("png-bytes").toString("base64"),
      });
    });
    expect(mockReplace).toHaveBeenCalledWith("EditMode", { goalId: "goal-1" });
  });

  // Regression: issue #60 — design must survive cold start. saveAndNavigate
  // persists to goal.design alongside the warm pendingDesignStore write.
  it("persists serialized design to goal.design on Use This Design", async () => {
    mockUseQuery.mockReturnValue([makeGoalRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={newGoalRoute} navigation={{} as never} />,
    );

    fireEvent.press(
      screen.getByText(i18n.t("badgeDesigner:actions.useThisDesign")),
    );

    await waitFor(() => {
      expect(mockUpdateGoal).toHaveBeenCalledWith("goal-1", {
        design: expect.stringContaining('"shape"'),
      });
    });
  });

  it("persists default design to goal.design on Skip — Use Default", async () => {
    mockUseQuery.mockReturnValue([makeGoalRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={newGoalRoute} navigation={{} as never} />,
    );

    fireEvent.press(
      screen.getByText(i18n.t("badgeDesigner:actions.skipDefault")),
    );

    // "I want the default" is a real user choice — also survives cold start.
    await waitFor(() => {
      expect(mockUpdateGoal).toHaveBeenCalledWith("goal-1", {
        design: expect.stringContaining('"shape"'),
      });
    });
  });

  // Regression: cold-start re-entry to the designer (e.g. "Redesign First"
  // after force-quit) used to read only pendingDesignStore and lose the
  // configured design. initialDesign now falls through to goal.design.
  it("hydrates initialDesign from goal.design when pendingDesignStore is empty", () => {
    mockPendingDesignStore.get.mockReturnValueOnce(undefined);
    const persistedDesignJson = JSON.stringify({
      shape: "shield",
      color: "#ff00ff",
      iconName: "Heart",
      iconWeight: "fill",
      title: "Cold Start",
      centerMode: "icon",
      frame: "none",
    });
    mockUseQuery.mockReturnValue([
      makeGoalRow({ design: persistedDesignJson }),
    ]);
    renderWithProviders(
      <BadgeDesignerScreen route={newGoalRoute} navigation={{} as never} />,
    );
    // Shield is the persisted shape; if the screen had fallen through to the
    // default it would render circle. The shape selector exposes the chosen
    // shape via a "selected" accessibilityState.
    const shieldOption = screen.getByLabelText(shapeLabel("shield"));
    expect(shieldOption.props.accessibilityState?.checked).toBe(true);
  });

  it("pendingDesignStore wins over goal.design when both are present", () => {
    const warmJson = JSON.stringify({
      shape: "star",
      color: "#0000ff",
      iconName: "Heart",
      iconWeight: "fill",
      title: "Warm",
      centerMode: "icon",
      frame: "none",
    });
    const persistedJson = JSON.stringify({
      shape: "shield",
      color: "#ff00ff",
      iconName: "Heart",
      iconWeight: "fill",
      title: "Persisted",
      centerMode: "icon",
      frame: "none",
    });
    mockPendingDesignStore.get.mockReturnValueOnce({
      designJson: warmJson,
      pngBase64: "",
    });
    mockUseQuery.mockReturnValue([makeGoalRow({ design: persistedJson })]);
    renderWithProviders(
      <BadgeDesignerScreen route={newGoalRoute} navigation={{} as never} />,
    );
    // Star (warm) wins over shield (persisted) — preserves the warm PNG path.
    const starOption = screen.getByLabelText(shapeLabel("star"));
    expect(starOption.props.accessibilityState?.checked).toBe(true);
  });

  it("with returnVia: 'back', save navigates goBack() instead of replace('EditMode')", async () => {
    // Redesign-First round-trip from CompletionFlow: the screen owns the
    // back navigation, so the designer must goBack() after save rather than
    // replacing into EditMode (which would discard the CompletionFlow
    // entry).
    const backRoute = {
      params: {
        mode: "new-goal" as const,
        goalId: "goal-1",
        returnVia: "back" as const,
      },
      key: "BadgeDesigner-back",
      name: "BadgeDesigner" as const,
    } as unknown as BadgeDesignerScreenProps["route"];
    mockUseQuery.mockReturnValue([makeGoalRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={backRoute} navigation={{} as never} />,
    );

    fireEvent.press(
      screen.getByText(i18n.t("badgeDesigner:actions.useThisDesign")),
    );

    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("alerts and does not navigate when capture fails", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockCaptureBadge.mockRejectedValueOnce(new Error("view not mounted"));
    mockUseQuery.mockReturnValue([makeGoalRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={newGoalRoute} navigation={{} as never} />,
    );

    fireEvent.press(
      screen.getByText(i18n.t("badgeDesigner:actions.useThisDesign")),
    );

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        i18n.t("badgeDesigner:errors.saveFailedTitle"),
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
    expect(
      screen.queryByText(i18n.t("badgeDesigner:actions.useThisDesign")),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Integration tests (#191)
// ---------------------------------------------------------------------------

describe("BadgeDesignerScreen — integration", () => {
  it("full happy path: frame + path text + banner → save → verify JSON", async () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    // Select guilloche frame
    openSection("frame");
    fireEvent.press(screen.getByLabelText(frameLabel("guilloche")));

    // Inscriptions: enable path text, type text
    openSection("inscriptions");
    fireEvent.press(
      screen.getByLabelText(i18n.t("badgeDesigner:pathText.toggleA11y")),
    );
    fireEvent.changeText(
      screen.getByLabelText(i18n.t("badgeDesigner:pathText.topA11y")),
      "ACHIEVEMENT",
    );

    // Enable banner, type text (Inscriptions stays open)
    fireEvent.press(
      screen.getByLabelText(i18n.t("badgeDesigner:banner.toggleA11y")),
    );
    fireEvent.changeText(
      screen.getByLabelText(i18n.t("badgeDesigner:banner.textA11y")),
      "WINNER",
    );

    // Save (updateBadge runs after capture resolves — capture-first order).
    fireEvent.press(
      screen.getByLabelText(i18n.t("badgeDesigner:actions.save")),
    );
    await waitFor(() => expect(mockUpdateBadge).toHaveBeenCalledTimes(1));

    const savedJson = mockUpdateBadge.mock.calls[0][1].design;
    const parsed = JSON.parse(savedJson);
    expect(parsed.frame).toBe("guilloche");
    expect(parsed.pathText).toBe("ACHIEVEMENT");
    expect(parsed.pathTextPosition).toBe("top");
    expect(parsed.banner).toEqual(
      expect.objectContaining({ text: "WINNER", position: "top" }),
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
    expect(
      screen.getByLabelText(i18n.t("badgeDesigner:actions.save")),
    ).toBeOnTheScreen();
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

describe("BadgeDesignerScreen — pseudo locale", () => {
  afterEach(async () => {
    if (i18n.language !== "en") await i18n.changeLanguage("en");
  });

  // Each case sets up the render path that actually exercises the key, then
  // asserts the bracketed pseudo string reaches the rendered UI. Asserting
  // only `i18n.t(key).startsWith("[")` would pass even if the component
  // hardcoded English and never called `t()` — defeating the migration guard.
  // Spread across header, fallback, section label, and CTA so a single
  // missed t() call can't slip through.
  it.each([
    {
      key: "badgeDesigner:title" as const,
      setup: () => mockUseQuery.mockReturnValue([makeRow()]),
    },
    {
      key: "badgeDesigner:sections.shape" as const,
      setup: () => mockUseQuery.mockReturnValue([makeRow()]),
    },
    {
      key: "badgeDesigner:actions.save" as const,
      setup: () => mockUseQuery.mockReturnValue([makeRow()]),
    },
    {
      key: "badgeDesigner:fallback.badgeNotFound" as const,
      setup: () => mockUseQuery.mockReturnValue([]),
    },
  ])(
    "renders $key as bracketed copy under pseudo locale",
    async ({ key, setup }) => {
      await i18n.changeLanguage("pseudo");
      setup();
      renderWithProviders(
        <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
      );
      const pseudo = i18n.t(key);
      expect(pseudo.startsWith("[")).toBe(true);
      expect(screen.getByText(pseudo)).toBeOnTheScreen();
    },
  );

  it("passes errors.saveFailedTitle as the alert title under pseudo locale", async () => {
    // saveFailedTitle is only ever passed to Alert.alert — it's never
    // rendered to the DOM, so getByText can't see it. Spy on Alert.alert
    // and trigger the capture-failure path so we assert the actual call
    // site uses t(), not just that the resource happens to be bracketed.
    await i18n.changeLanguage("pseudo");
    mockUseQuery.mockReturnValue([makeRow()]);
    mockCaptureBadge.mockRejectedValue(new Error("capture timeout"));
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    const pseudoTitle = i18n.t("badgeDesigner:errors.saveFailedTitle");
    expect(pseudoTitle.startsWith("[")).toBe(true);

    fireEvent.press(
      screen.getByLabelText(i18n.t("badgeDesigner:actions.save")),
    );

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(pseudoTitle, expect.anything()),
    );
    alertSpy.mockRestore();
  });

  it("dynamic shape-option key reaches the rendered selector under pseudo locale", async () => {
    // Goes through the `optionA11y` interpolation template the way
    // ShapeSelector actually uses it — catches regressions where either
    // the option key or the wrapping template gets hardcoded back to
    // English.
    await i18n.changeLanguage("pseudo");
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    const pseudoOption = i18n.t("badgeDesigner:shape.options.circle");
    expect(pseudoOption.startsWith("[")).toBe(true);
    expect(screen.getByLabelText(shapeLabel("circle"))).toBeOnTheScreen();
  });
});
