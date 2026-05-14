import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { BadgeDetailScreen } from "../BadgeDetailScreen";
import type { BadgeDetailScreenProps } from "../../../navigation/types";

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

const mockParentNavigate = jest.fn();
const mockGetParentFactory = jest.fn(() => ({ navigate: mockParentNavigate }));
jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      getParent: mockGetParentFactory,
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
  badgeVersionsByGoalQuery: jest.fn(() => ({
    __brand: "badgeVersionsByGoalQuery",
  })),
}));

jest.mock("../../../hooks/useCreateBadge", () => ({
  PLACEHOLDER_IMAGE_URI: "pending:baked-image",
}));

const mockExportImage = jest.fn();
const mockExportJSON = jest.fn();
const mockExportDesignImage = jest.fn();
jest.mock("../../../hooks/useBadgeExport", () => ({
  useBadgeExport: () => ({
    exportImage: mockExportImage,
    exportDesignImage: mockExportDesignImage,
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
  updatedAt: "2026-01-28T00:00:00.000Z",
  goalTitle: "Learn TypeScript",
  completedAt: "2026-01-28T00:00:00.000Z",
  ...overrides,
});

/** Helper to set both the joined-badge query and the versions list. */
function setupQueries({
  badge = makeRow(),
  versions = [] as Array<Record<string, unknown>>,
}: {
  badge?: ReturnType<typeof makeRow> | null;
  versions?: Array<Record<string, unknown>>;
} = {}) {
  mockUseQuery.mockImplementation((query: unknown) => {
    if (
      typeof query === "object" &&
      query !== null &&
      (query as { __brand?: string }).__brand === "badgeVersionsByGoalQuery"
    ) {
      return versions;
    }
    return badge ? [badge] : [];
  });
}

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

  it('renders "Customize Badge" button and navigates to BadgeDesigner', () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
    );

    const customizeBtn = screen.getByLabelText("Customize Badge");
    expect(customizeBtn).toBeOnTheScreen();

    fireEvent.press(customizeBtn);
    expect(mockNavigate).toHaveBeenCalledWith("BadgeDesigner", {
      badgeId: "badge-1",
    });
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

  describe("outdated badge signal", () => {
    it("renders the 'Design updated · Reopen to re-issue' caption when updatedAt > createdAt", () => {
      setupQueries({
        badge: makeRow({
          createdAt: "2026-01-28T00:00:00.000Z",
          updatedAt: "2026-01-28T10:00:00.000Z",
        }),
      });
      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(screen.getByTestId("badge-outdated-caption")).toBeOnTheScreen();
      expect(
        screen.getByText("Design updated · Reopen to re-issue"),
      ).toBeOnTheScreen();
    });

    it("does NOT render the outdated caption when createdAt == updatedAt", () => {
      setupQueries({ badge: makeRow() });
      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(
        screen.queryByTestId("badge-outdated-caption"),
      ).not.toBeOnTheScreen();
    });

    it("navigates to GoalsTab > CompletionFlow when the outdated caption is tapped", () => {
      setupQueries({
        badge: makeRow({
          createdAt: "2026-01-28T00:00:00.000Z",
          updatedAt: "2026-01-28T10:00:00.000Z",
        }),
      });
      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      fireEvent.press(screen.getByTestId("badge-outdated-caption"));
      expect(mockParentNavigate).toHaveBeenCalledWith("GoalsTab", {
        screen: "CompletionFlow",
        params: { goalId: "goal-1" },
      });
    });
  });

  describe("version chip + history modal", () => {
    it("does NOT render the chip when only one version exists", () => {
      setupQueries({
        badge: makeRow(),
        versions: [makeRow({ isDeleted: null })],
      });
      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(screen.queryByTestId("badge-version-chip")).not.toBeOnTheScreen();
    });

    it("renders 'vN of M · History' chip when multiple versions exist", () => {
      setupQueries({
        badge: makeRow({ id: "badge-current" }),
        versions: [
          makeRow({ id: "badge-current", isDeleted: null }),
          makeRow({ id: "badge-v1", isDeleted: 1 }),
        ],
      });
      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(screen.getByTestId("badge-version-chip")).toBeOnTheScreen();
      expect(screen.getByText("v2 of 2 · History")).toBeOnTheScreen();
    });

    it("opens the BadgeVersionHistoryModal when the chip is tapped", () => {
      setupQueries({
        badge: makeRow({ id: "badge-current" }),
        versions: [
          makeRow({ id: "badge-current", isDeleted: null }),
          makeRow({ id: "badge-v1", isDeleted: 1 }),
        ],
      });
      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      fireEvent.press(screen.getByTestId("badge-version-chip"));
      expect(screen.getByText("Version history")).toBeOnTheScreen();
    });
  });
});
