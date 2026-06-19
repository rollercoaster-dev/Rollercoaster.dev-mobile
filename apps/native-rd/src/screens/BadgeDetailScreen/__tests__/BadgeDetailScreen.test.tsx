import React from "react";
import { Alert } from "react-native";
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
const mockParentNavigate = jest.fn();
// Controllable so individual tests can simulate "no tab parent" by calling
// `mockGetParent.mockReturnValueOnce(undefined)`.
const mockGetParent = jest.fn(() => ({ navigate: mockParentNavigate }));

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
      getParent: mockGetParent,
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

const mockDeleteBadge = jest.fn();
jest.mock("../../../db", () => ({
  badgeWithGoalQuery: jest.fn(() => ({ __brand: "badgeWithGoalQuery" })),
  deleteBadge: (...args: unknown[]) => mockDeleteBadge(...args),
}));

const mockReportError = jest.fn();
jest.mock("../../../services/sentry-report", () => ({
  reportError: (...args: unknown[]) => mockReportError(...args),
}));

jest.mock("../../../hooks/useCreateBadge", () => ({
  PLACEHOLDER_IMAGE_URI: "pending:baked-image",
}));

const mockExportImage = jest.fn();
const mockExportJSON = jest.fn();
const mockExportVerifiableBadge = jest.fn();
jest.mock("../../../hooks/useBadgeExport", () => ({
  useBadgeExport: () => ({
    exportVerifiableBadge: mockExportVerifiableBadge,
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

  describe("delete badge", () => {
    it("opens the confirm-delete modal instead of deleting immediately", () => {
      mockUseQuery.mockReturnValue([makeRow()]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      fireEvent.press(screen.getByRole("button", { name: "Delete Badge" }));

      // Modal copy is visible; nothing has been deleted yet.
      expect(
        screen.getByText(
          "This will permanently remove this badge. This cannot be undone.",
        ),
      ).toBeOnTheScreen();
      expect(mockDeleteBadge).not.toHaveBeenCalled();
    });

    it("deletes the badge and navigates back on confirm", () => {
      mockUseQuery.mockReturnValue([makeRow()]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      fireEvent.press(screen.getByRole("button", { name: "Delete Badge" }));
      fireEvent.press(screen.getByRole("button", { name: "Delete" }));

      expect(mockDeleteBadge).toHaveBeenCalledWith("badge-1");
      expect(mockGoBack).toHaveBeenCalled();
    });

    it("does not delete when the modal is cancelled", () => {
      mockUseQuery.mockReturnValue([makeRow()]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      fireEvent.press(screen.getByRole("button", { name: "Delete Badge" }));
      fireEvent.press(screen.getByRole("button", { name: "Cancel" }));

      expect(mockDeleteBadge).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it("keeps the user on the screen and reports when delete fails", () => {
      mockUseQuery.mockReturnValue([makeRow()]);
      mockDeleteBadge.mockImplementationOnce(() => {
        throw new Error("Failed to delete badge. Please try again.");
      });
      const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      fireEvent.press(screen.getByRole("button", { name: "Delete Badge" }));
      fireEvent.press(screen.getByRole("button", { name: "Delete" }));

      // Failure is surfaced and reported; the user is NOT navigated away.
      expect(mockReportError).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });

  describe("export buttons", () => {
    it("renders all three export buttons when badge exists", () => {
      mockUseQuery.mockReturnValue([makeRow()]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(
        screen.getByLabelText("Export Verifiable Badge"),
      ).toBeOnTheScreen();
      expect(
        screen.getByLabelText("Export Credential (JSON)"),
      ).toBeOnTheScreen();
      expect(screen.getByLabelText("Save as Image")).toBeOnTheScreen();
    });

    it('disables "Export Verifiable Badge" and "Save as Image" when image is placeholder', () => {
      mockUseQuery.mockReturnValue([
        makeRow({ imageUri: "pending:baked-image" }),
      ]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(
        screen.getByLabelText("Export Verifiable Badge").props
          .accessibilityState,
      ).toEqual(expect.objectContaining({ disabled: true }));
      expect(
        screen.getByLabelText("Save as Image").props.accessibilityState,
      ).toEqual(expect.objectContaining({ disabled: true }));
    });

    it("enables the image-export buttons when badge has a real image", () => {
      mockUseQuery.mockReturnValue([
        makeRow({ imageUri: "file:///badges/badge.png" }),
      ]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(
        screen.getByLabelText("Export Verifiable Badge").props
          .accessibilityState,
      ).toEqual(expect.objectContaining({ disabled: false }));
      expect(
        screen.getByLabelText("Save as Image").props.accessibilityState,
      ).toEqual(expect.objectContaining({ disabled: false }));
    });

    it('calls exportVerifiableBadge when "Export Verifiable Badge" is pressed', () => {
      mockUseQuery.mockReturnValue([
        makeRow({ imageUri: "file:///badges/badge.png" }),
      ]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      fireEvent.press(screen.getByLabelText("Export Verifiable Badge"));
      expect(mockExportVerifiableBadge).toHaveBeenCalledWith(
        "file:///badges/badge.png",
      );
    });

    it('calls exportImage when "Save as Image" is pressed', () => {
      mockUseQuery.mockReturnValue([
        makeRow({ imageUri: "file:///badges/badge.png" }),
      ]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      fireEvent.press(screen.getByLabelText("Save as Image"));
      expect(mockExportImage).toHaveBeenCalledWith("file:///badges/badge.png");
    });

    // Regression: prior code branched on `design ?` and re-rasterized the
    // live renderer instead of using the baked PNG on disk, so every
    // export of a designer-saved badge shipped without the iTXt
    // credential. The primary export must always forward the on-disk
    // imageUri, even when `design` is populated.
    it("exports the baked PNG on disk even when a design is set", () => {
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
      fireEvent.press(screen.getByLabelText("Export Verifiable Badge"));

      expect(mockExportVerifiableBadge).toHaveBeenCalledTimes(1);
      expect(mockExportVerifiableBadge).toHaveBeenCalledWith(
        "file:///badges/badge.png",
      );
    });

    // Parallel guard on the lossy path: even though "Save as Image" is the
    // documented-as-lossy export, it must still forward `imageUri` (the
    // baked PNG) rather than fall back to a re-rasterized renderer capture
    // when a design is present. Locks the broader "no path re-rasterizes"
    // intent — without this test, a future refactor could re-introduce a
    // softer version of the original bug here without breaking anything.
    it("save-as-image forwards the baked PNG even when a design is set", () => {
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
      fireEvent.press(screen.getByLabelText("Save as Image"));

      expect(mockExportImage).toHaveBeenCalledTimes(1);
      expect(mockExportImage).toHaveBeenCalledWith("file:///badges/badge.png");
    });

    it("surfaces a hint on Save as Image about messenger-stripped credentials", () => {
      mockUseQuery.mockReturnValue([
        makeRow({ imageUri: "file:///badges/badge.png" }),
      ]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      const btn = screen.getByLabelText("Save as Image");
      expect(btn.props.accessibilityHint).toMatch(/credential may be lost/);
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

  describe("how it was earned — evidence list", () => {
    const credentialWith = (evidence: unknown[], narrative = "Did it.") =>
      JSON.stringify({
        credentialSubject: {
          achievement: { criteria: { narrative } },
        },
        evidence,
      });

    it("renders each evidence item's name and translated type label", () => {
      const credential = credentialWith([
        {
          id: "urn:ulid:ev-1",
          type: ["Evidence"],
          name: "Watch intro video",
          genre: "video",
        },
        {
          id: "urn:ulid:ev-2",
          type: ["Evidence"],
          name: "Build a small app",
          genre: "photo",
        },
      ]);
      mockUseQuery.mockReturnValue([makeRow({ credential })]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(screen.getByText("Watch intro video")).toBeOnTheScreen();
      expect(screen.getByText("Build a small app")).toBeOnTheScreen();
      // Translated type labels come from common.json "evidenceTypes.<type>.label"
      expect(screen.getByText("Video")).toBeOnTheScreen();
      expect(screen.getByText("Photo")).toBeOnTheScreen();
    });

    it("exposes each row's accessibility label individually (parent must not flatten descendants)", () => {
      // Regression: a previous version set `accessible` on the outer list
      // View, which made React Native merge all rows into a single a11y node
      // and prevented screen-reader users from focusing individual items.
      const credential = credentialWith([
        {
          id: "urn:ulid:ev-1",
          type: ["Evidence"],
          name: "Watch intro video",
          genre: "video",
        },
        {
          id: "urn:ulid:ev-2",
          type: ["Evidence"],
          name: "Build a small app",
          genre: "photo",
        },
      ]);
      mockUseQuery.mockReturnValue([makeRow({ credential })]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(
        screen.getByLabelText("Watch intro video, submitted as Video"),
      ).toBeOnTheScreen();
      expect(
        screen.getByLabelText("Build a small app, submitted as Photo"),
      ).toBeOnTheScreen();
    });

    it("uses the singular plural form when exactly one evidence item is present", () => {
      const credential = credentialWith([
        {
          id: "urn:ulid:ev-1",
          type: ["Evidence"],
          name: "Watch intro video",
          genre: "video",
        },
      ]);
      mockUseQuery.mockReturnValue([makeRow({ credential })]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      // Singular: "1 evidence item submitted", not "1 evidence items submitted".
      expect(
        screen.getByLabelText("1 evidence item submitted"),
      ).toBeOnTheScreen();
    });

    it("labels unknown-genre rows with a generic 'evidence' type for screen readers", () => {
      // Visually the type caption is dropped (verified above) — but a11y
      // must still announce *something* so the row isn't read as a bare
      // proper-noun-looking string.
      const credential = credentialWith([
        {
          id: "urn:ulid:ev-1",
          type: ["Evidence"],
          name: "Mystery step",
        },
      ]);
      mockUseQuery.mockReturnValue([makeRow({ credential })]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(
        screen.getByLabelText("Mystery step, submitted as evidence"),
      ).toBeOnTheScreen();
    });

    it("renders the row but no type label when the credential's genre is missing or unknown", () => {
      // An older / cross-version credential may omit `genre` entirely, or
      // carry a type the local app doesn't know yet. Either way the row must
      // still render the step name — we just drop the icon/label chrome.
      const credential = credentialWith([
        {
          id: "urn:ulid:ev-1",
          type: ["Evidence"],
          name: "Mystery step",
          // no genre
        },
        {
          id: "urn:ulid:ev-2",
          type: ["Evidence"],
          name: "Future step",
          genre: "hologram", // unknown to this app version
        },
      ]);
      mockUseQuery.mockReturnValue([makeRow({ credential })]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(screen.getByText("Mystery step")).toBeOnTheScreen();
      expect(screen.getByText("Future step")).toBeOnTheScreen();
      // No "File" fallback should sneak in — unknown genres become null,
      // not coerced into the catch-all "file" type that validateEvidenceType
      // uses on the capture path.
      expect(screen.queryByText("File")).toBeNull();
    });

    it("hides the section entirely when the credential has no narrative and no evidence", () => {
      const credential = JSON.stringify({
        credentialSubject: { achievement: { criteria: {} } },
      });
      mockUseQuery.mockReturnValue([makeRow({ credential })]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(screen.queryByText("How it was earned")).toBeNull();
    });

    it("shows the section with just the narrative when evidence is absent (older badges)", () => {
      const credential = JSON.stringify({
        credentialSubject: {
          achievement: {
            criteria: { narrative: "Finished the thing." },
          },
        },
      });
      mockUseQuery.mockReturnValue([makeRow({ credential })]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(screen.getByText("How it was earned")).toBeOnTheScreen();
      expect(screen.getByText("Finished the thing.")).toBeOnTheScreen();
    });

    it("skips malformed evidence entries (missing id or name)", () => {
      const credential = credentialWith([
        {
          id: "urn:ulid:ev-1",
          type: ["Evidence"],
          name: "Good",
          genre: "text",
        },
        { id: "urn:ulid:ev-2", type: ["Evidence"], genre: "photo" }, // no name
        { type: ["Evidence"], name: "No id", genre: "video" }, // no id
        null,
        "not-an-object",
      ]);
      mockUseQuery.mockReturnValue([makeRow({ credential })]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(screen.getByText("Good")).toBeOnTheScreen();
      expect(screen.queryByText("No id")).toBeNull();
    });
  });

  describe("view timeline", () => {
    it("hides the button when the badge has no goalId (soft-deleted goal)", () => {
      // badgeWithGoalQuery LEFT-JOINs on goal.isDeleted IS NULL, so a
      // soft-deleted goal surfaces here as a null goalId even though
      // badges.goalId itself is non-null in the schema.
      mockUseQuery.mockReturnValue([makeRow({ goalId: null })]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(screen.queryByLabelText("View timeline")).toBeNull();
    });

    it("hops to the Goals tab's TimelineJourney route with the badge's goalId", () => {
      mockUseQuery.mockReturnValue([makeRow({ goalId: "goal-42" })]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      fireEvent.press(screen.getByLabelText("View timeline"));
      expect(mockParentNavigate).toHaveBeenCalledWith("GoalsTab", {
        screen: "TimelineJourney",
        // originBadgeId lets TimelineJourney route its "back" affordances
        // back to this screen instead of leaving the user on the Goals tab.
        params: { goalId: "goal-42", originBadgeId: "badge-1" },
        initial: false,
      });
    });

    it("no-ops safely (no crash, no nav call) when the tab parent is unavailable", () => {
      // If BadgeDetailScreen is ever hosted outside the bottom-tab navigator
      // (deep link / modal host / Storybook), `getParent()` returns undefined.
      // The handler must short-circuit rather than throw on `.navigate`.
      // Cast: the default impl narrows the return type, but in production
      // `getParent()` is explicitly typed `T | undefined` — this models that.
      mockGetParent.mockReturnValueOnce(
        undefined as unknown as ReturnType<typeof mockGetParent>,
      );
      mockUseQuery.mockReturnValue([makeRow({ goalId: "goal-42" })]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(() =>
        fireEvent.press(screen.getByLabelText("View timeline")),
      ).not.toThrow();
      expect(mockParentNavigate).not.toHaveBeenCalled();
    });
  });
});
