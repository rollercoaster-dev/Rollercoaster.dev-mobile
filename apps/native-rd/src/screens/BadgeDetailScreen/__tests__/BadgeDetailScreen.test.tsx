import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { BadgeDetailScreen } from "../BadgeDetailScreen";
import type { BadgeDetailScreenProps } from "../../../navigation/types";
import { createDefaultBadgeDesign } from "../../../badges/types";

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
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

jest.mock("../../../db", () => ({
  badgeWithGoalQuery: jest.fn(() => ({ __brand: "badgeWithGoalQuery" })),
}));

jest.mock("../../../hooks/useCreateBadge", () => ({
  PLACEHOLDER_IMAGE_URI: "pending:baked-image",
}));

const mockExportImage = jest.fn();
const mockExportJSON = jest.fn();
jest.mock("../../../hooks/useBadgeExport", () => ({
  useBadgeExport: () => ({
    exportImage: mockExportImage,
    exportJSON: mockExportJSON,
    isExportingImage: false,
    isExportingJSON: false,
  }),
}));

/** Helper to create a joined badge+goal row matching badgeWithGoalQuery shape */
const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: "badge-1",
  goalId: "goal-1",
  credential: "{}",
  imageUri: "pending:baked-image",
  createdAt: "2026-01-28T00:00:00.000Z",
  goalTitle: "Learn TypeScript",
  completedAt: "2026-01-28T00:00:00.000Z",
  ...overrides,
});

const mockRoute = {
  params: { badgeId: "badge-1" },
  key: "BadgeDetail-1",
  name: "BadgeDetail" as const,
} as BadgeDetailScreenProps["route"];

beforeEach(() => {
  jest.clearAllMocks();
  mockUseQuery.mockReturnValue([]);
});

describe("BadgeDetailScreen", () => {
  it('renders "Badge not found" when badge does not exist', () => {
    renderWithProviders(
      <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByText("Badge not found")).toBeOnTheScreen();
  });

  it("renders goal title when badge and goal exist", () => {
    mockUseQuery.mockReturnValue([makeRow()]);

    renderWithProviders(
      <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByText("Learn TypeScript")).toBeOnTheScreen();
  });

  it("renders earned date", () => {
    mockUseQuery.mockReturnValue([
      makeRow({ completedAt: "2026-01-28T00:00:00.000Z" }),
    ]);

    renderWithProviders(
      <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByText("Earned Jan 28, 2026")).toBeOnTheScreen();
  });

  it("shows initial letter fallback when image is placeholder", () => {
    mockUseQuery.mockReturnValue([
      makeRow({ imageUri: "pending:baked-image" }),
    ]);

    renderWithProviders(
      <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByText("L")).toBeOnTheScreen();
  });

  it("renders Image with accessibility label when badge has a real imageUri", () => {
    mockUseQuery.mockReturnValue([
      makeRow({
        imageUri: "file:///path/to/badge.png",
        goalTitle: "Learn Rust",
      }),
    ]);

    renderWithProviders(
      <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(
      screen.getByLabelText("Badge image for Learn Rust"),
    ).toBeOnTheScreen();
  });

  it('renders "Untitled" when goal is null (orphaned badge)', () => {
    mockUseQuery.mockReturnValue([
      makeRow({ goalTitle: null, completedAt: null }),
    ]);

    renderWithProviders(
      <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByText("Untitled")).toBeOnTheScreen();
  });

  it("navigates back when back button is pressed", () => {
    renderWithProviders(
      <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
    );
    fireEvent.press(screen.getByLabelText("Go back"));
    expect(mockGoBack).toHaveBeenCalled();
  });

  describe("export buttons", () => {
    it("renders export buttons when badge exists", () => {
      mockUseQuery.mockReturnValue([makeRow()]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(screen.getByLabelText("Save Image")).toBeOnTheScreen();
      expect(
        screen.getByLabelText("Export Credential (JSON)"),
      ).toBeOnTheScreen();
    });

    it('disables "Save Image" when image is placeholder', () => {
      mockUseQuery.mockReturnValue([
        makeRow({ imageUri: "pending:baked-image" }),
      ]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      const saveImageBtn = screen.getByLabelText("Save Image");
      expect(saveImageBtn.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    });

    it('enables "Save Image" when badge has a real image', () => {
      mockUseQuery.mockReturnValue([
        makeRow({ imageUri: "file:///badges/badge.png" }),
      ]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      const saveImageBtn = screen.getByLabelText("Save Image");
      expect(saveImageBtn.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: false }),
      );
    });

    it('calls exportImage when "Save Image" is pressed', () => {
      mockUseQuery.mockReturnValue([
        makeRow({ imageUri: "file:///badges/badge.png" }),
      ]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      fireEvent.press(screen.getByLabelText("Save Image"));
      expect(mockExportImage).toHaveBeenCalledWith("file:///badges/badge.png");
    });

    // Regression: prior code branched on `design ?` and called a separate
    // exportDesignImage path that re-rasterized the live renderer instead of
    // using the baked PNG on disk. That bypassed bakePNG() entirely, so every
    // export of a designer-saved badge shipped without the iTXt credential.
    // Fixture intentionally includes BOTH a serialized design AND a real
    // imageUri — the same shape every successfully-baked badge has.
    it("exports the baked PNG on disk even when a design is set (Tier 1 regression)", () => {
      const design = JSON.stringify(
        createDefaultBadgeDesign("Learn TypeScript", "#4caf50"),
      );
      mockUseQuery.mockReturnValue([
        makeRow({
          imageUri: "file:///badges/badge.png",
          design,
        }),
      ]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      fireEvent.press(screen.getByLabelText("Save Image"));

      expect(mockExportImage).toHaveBeenCalledTimes(1);
      expect(mockExportImage).toHaveBeenCalledWith("file:///badges/badge.png");
    });

    it('calls exportJSON when "Export Credential (JSON)" is pressed', () => {
      mockUseQuery.mockReturnValue([makeRow({ credential: '{"type":"VC"}' })]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      fireEvent.press(screen.getByLabelText("Export Credential (JSON)"));
      expect(mockExportJSON).toHaveBeenCalledWith(
        '{"type":"VC"}',
        "Learn TypeScript",
      );
    });
  });
});
