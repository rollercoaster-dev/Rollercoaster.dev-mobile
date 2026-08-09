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

const designJSON = JSON.stringify(
  createDefaultBadgeDesign("Learn TypeScript", "#4caf50"),
);

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
  // deleteBadge returns an Evolu Result; the handler now checks `.ok`, so the
  // mock must hand back a success Result by default. Failure tests override.
  mockDeleteBadge.mockReturnValue({ ok: true, value: {} });
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

  // The earned date lives in the hero's verifiable chip for credentialed
  // badges. The standalone line only fills the gap when there is no chip, so
  // the date is never shown twice and never lost.
  it("shows the standalone earned line only when the hero has no chip", () => {
    mockUseQuery.mockReturnValue([
      makeRow({
        credential: null,
        completedAt: "2026-01-28T00:00:00.000Z",
      }),
    ]);

    renderWithProviders(
      <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByText("Earned Jan 28, 2026")).toBeOnTheScreen();
  });

  it("drops the standalone earned line when the hero's chip carries the date", () => {
    mockUseQuery.mockReturnValue([
      makeRow({
        credential: '{"type":"VC"}',
        completedAt: "2026-01-28T00:00:00.000Z",
      }),
    ]);

    renderWithProviders(
      <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.queryByText("Earned Jan 28, 2026")).toBeNull();
    expect(
      screen.getByText("Verifiable · earned Jan 28, 2026"),
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

  it("navigates back from the not-found state's fallback header", () => {
    // Default mockUseQuery is [] — no badge, so the hero can't render and the
    // fallback header owns the only way out.
    renderWithProviders(
      <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
    );
    fireEvent.press(screen.getByLabelText("Go back"));
    expect(mockGoBack).toHaveBeenCalled();
  });

  describe("celebration hero", () => {
    it("navigates back when the hero's back arrow is pressed", () => {
      mockUseQuery.mockReturnValue([makeRow()]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      fireEvent.press(screen.getByTestId("celebration-hero-back"));
      expect(mockGoBack).toHaveBeenCalled();
    });

    // The old floating preview had a three-way chain (design → raw Image →
    // initial-on-tile). The hero owns the undesigned fallback now: a null
    // design still renders a badge (monogram), never a blank slot.
    it.each([
      { name: "designed", design: designJSON },
      { name: "undesigned", design: null },
    ])("renders the hero badge for a $name badge", ({ design }) => {
      mockUseQuery.mockReturnValue([makeRow({ design })]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(screen.getByTestId("badge-renderer")).toBeOnTheScreen();
    });

    it("shows the verifiable chip with the earned date when a credential exists", () => {
      mockUseQuery.mockReturnValue([
        makeRow({
          credential: '{"type":"VC"}',
          completedAt: "2026-01-28T00:00:00.000Z",
        }),
      ]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(
        screen.getByText("Verifiable · earned Jan 28, 2026"),
      ).toBeOnTheScreen();
    });

    // No credential means no verifiability claim — the chip is absent rather
    // than shown in a "missing"/"unverified" framing.
    it("hides the verifiable chip when the badge has no credential", () => {
      mockUseQuery.mockReturnValue([makeRow({ credential: null })]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(screen.queryByTestId("verified-credential-chip")).toBeNull();
    });
  });

  // The goal's icon/color chip is not part of Direction C's About/Details
  // blocks and belongs to no storied component, so it is gone from the screen.
  it("renders no identity chip even when the goal has an icon and color", () => {
    mockUseQuery.mockReturnValue([
      makeRow({ goalIcon: "🎯", goalColor: "#4caf50" }),
    ]);

    renderWithProviders(
      <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.queryByText("🎯")).toBeNull();
    expect(screen.queryByLabelText(/Goal identity/)).toBeNull();
  });

  describe("overflow menu", () => {
    const openMenu = () => {
      fireEvent.press(screen.getByTestId("celebration-hero-overflow"));
    };

    it("is closed until the ⋯ control is pressed", () => {
      mockUseQuery.mockReturnValue([makeRow()]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(screen.queryByTestId("overflow-row-share")).toBeNull();

      openMenu();
      expect(screen.getByTestId("overflow-row-share")).toBeOnTheScreen();
    });

    it("closes when the backdrop is pressed", () => {
      mockUseQuery.mockReturnValue([makeRow()]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      openMenu();
      fireEvent.press(screen.getByTestId("overflow-backdrop"));

      expect(screen.queryByTestId("overflow-row-share")).toBeNull();
    });

    // Both share entry points must land in the same sheet — the overflow row
    // is not a shortcut that exports directly with different behaviour.
    it("opens the share sheet from the Share row", () => {
      mockUseQuery.mockReturnValue([
        makeRow({ imageUri: "file:///badges/badge.png" }),
      ]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      openMenu();
      fireEvent.press(screen.getByTestId("overflow-row-share"));

      expect(screen.getByTestId("share-row-verifiable")).toBeOnTheScreen();
      expect(mockExportVerifiableBadge).not.toHaveBeenCalled();
    });

    it("exports the credential from the Export credential row", () => {
      mockUseQuery.mockReturnValue([makeRow({ credential: '{"type":"VC"}' })]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      openMenu();
      fireEvent.press(screen.getByTestId("overflow-row-credential"));

      expect(mockExportJSON).toHaveBeenCalledWith(
        '{"type":"VC"}',
        "Learn TypeScript",
      );
    });

    it("disables the Export credential row when the badge has no credential", () => {
      mockUseQuery.mockReturnValue([makeRow({ credential: null })]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      openMenu();

      expect(
        screen.getByTestId("overflow-row-credential").props.accessibilityState,
      ).toEqual(expect.objectContaining({ disabled: true }));
    });

    it("opens the confirm-delete modal from the Delete row", () => {
      mockUseQuery.mockReturnValue([makeRow()]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      openMenu();
      fireEvent.press(screen.getByTestId("overflow-row-delete"));

      expect(
        screen.getByText(
          "The badge will be removed. Your goal and its evidence stay in the timeline — only the credential artifact is deleted.",
        ),
      ).toBeOnTheScreen();
      expect(mockDeleteBadge).not.toHaveBeenCalled();
    });
  });

  describe("delete badge", () => {
    // Delete is demoted to the overflow menu — there is no standalone
    // destructive button on the page beside Share any more.
    const openDeleteConfirm = () => {
      fireEvent.press(screen.getByTestId("celebration-hero-overflow"));
      fireEvent.press(screen.getByTestId("overflow-row-delete"));
    };

    it("is not reachable from a standalone button on the page", () => {
      mockUseQuery.mockReturnValue([makeRow()]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(screen.queryByRole("button", { name: "Delete Badge" })).toBeNull();
    });

    it("opens the confirm-delete modal instead of deleting immediately", () => {
      mockUseQuery.mockReturnValue([makeRow()]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      openDeleteConfirm();

      // Modal copy is visible; nothing has been deleted yet.
      expect(
        screen.getByText(
          "The badge will be removed. Your goal and its evidence stay in the timeline — only the credential artifact is deleted.",
        ),
      ).toBeOnTheScreen();
      expect(mockDeleteBadge).not.toHaveBeenCalled();
    });

    it("deletes the badge and navigates back on confirm", () => {
      mockUseQuery.mockReturnValue([makeRow()]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      openDeleteConfirm();
      fireEvent.press(screen.getByRole("button", { name: "Delete" }));

      expect(mockDeleteBadge).toHaveBeenCalledWith("badge-1");
      expect(mockGoBack).toHaveBeenCalled();
    });

    it("does not delete when the modal is cancelled", () => {
      mockUseQuery.mockReturnValue([makeRow()]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      openDeleteConfirm();
      fireEvent.press(screen.getByRole("button", { name: "Keep it" }));

      expect(mockDeleteBadge).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it("keeps the user on the screen and reports when delete throws", () => {
      mockUseQuery.mockReturnValue([makeRow()]);
      mockDeleteBadge.mockImplementationOnce(() => {
        throw new Error("Failed to delete badge. Please try again.");
      });
      const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      openDeleteConfirm();
      fireEvent.press(screen.getByRole("button", { name: "Delete" }));

      // Failure is surfaced and reported; the user is NOT navigated away and
      // the confirmation modal stays open (its confirm button is still there).
      expect(mockReportError).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Delete" })).toBeOnTheScreen();

      alertSpy.mockRestore();
    });

    // deleteBadge signals a DB write failure with { ok: false } WITHOUT
    // throwing — the pre-fix catch never fired for this, so the modal closed
    // and the screen navigated away as if the delete succeeded.
    it("keeps the user on the screen and reports when delete returns { ok: false }", () => {
      mockUseQuery.mockReturnValue([makeRow()]);
      mockDeleteBadge.mockReturnValueOnce({
        ok: false,
        error: { type: "WriteError" },
      });
      const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      openDeleteConfirm();
      fireEvent.press(screen.getByRole("button", { name: "Delete" }));

      expect(mockReportError).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Delete" })).toBeOnTheScreen();

      alertSpy.mockRestore();
    });
  });

  describe("share sheet", () => {
    const openSheet = () =>
      fireEvent.press(screen.getByTestId("badge-share-cta"));

    it("renders the single Share CTA instead of a stacked export card", () => {
      mockUseQuery.mockReturnValue([makeRow()]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(screen.getByTestId("badge-share-cta")).toBeOnTheScreen();
      // The three old page-level export buttons are gone; they live in the
      // sheet now, behind the one CTA.
      expect(screen.queryByLabelText("Export Verifiable Badge")).toBeNull();
      expect(screen.queryByLabelText("Export Credential (JSON)")).toBeNull();
      expect(screen.queryByLabelText("Save as Image")).toBeNull();
    });

    it("opens the sheet, titled after the goal, when the CTA is pressed", () => {
      mockUseQuery.mockReturnValue([makeRow()]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(screen.queryByTestId("share-row-verifiable")).toBeNull();

      openSheet();

      expect(screen.getByTestId("share-row-verifiable")).toBeOnTheScreen();
      // Proves the screen hands the sheet an *uninterpolated* template and
      // lets the component substitute {{goalTitle}} itself.
      expect(
        screen.getByText("Share \u201cLearn TypeScript\u201d"),
      ).toBeOnTheScreen();
    });

    it.each([
      {
        row: "share-row-verifiable",
        fn: () => mockExportVerifiableBadge,
        args: ["file:///badges/badge.png", "Learn TypeScript"],
      },
      {
        row: "share-row-image",
        fn: () => mockExportImage,
        args: ["file:///badges/badge.png"],
      },
      {
        row: "share-row-credential",
        fn: () => mockExportJSON,
        args: ['{"type":"VC"}', "Learn TypeScript"],
      },
    ])("$row calls its useBadgeExport function", ({ row, fn, args }) => {
      mockUseQuery.mockReturnValue([
        makeRow({
          imageUri: "file:///badges/badge.png",
          credential: '{"type":"VC"}',
        }),
      ]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      openSheet();
      fireEvent.press(screen.getByTestId(row));

      expect(fn()).toHaveBeenCalledWith(...args);
    });

    it.each([
      {
        name: "placeholder image",
        overrides: { imageUri: "pending:baked-image" },
        expected: {
          "share-row-verifiable": true,
          "share-row-image": true,
          "share-row-credential": false,
        },
      },
      {
        name: "real image",
        overrides: { imageUri: "file:///badges/badge.png" },
        expected: {
          "share-row-verifiable": false,
          "share-row-image": false,
          "share-row-credential": false,
        },
      },
      {
        name: "no credential",
        overrides: {
          imageUri: "file:///badges/badge.png",
          credential: null,
        },
        expected: {
          "share-row-verifiable": false,
          "share-row-image": false,
          "share-row-credential": true,
        },
      },
    ])(
      "disables the right rows for a badge with a $name",
      ({ overrides, expected }) => {
        mockUseQuery.mockReturnValue([makeRow(overrides)]);

        renderWithProviders(
          <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
        );
        openSheet();

        Object.entries(expected).forEach(([row, disabled]) => {
          expect(screen.getByTestId(row).props.accessibilityState).toEqual(
            expect.objectContaining({ disabled }),
          );
        });
      },
    );

    // Regression: prior code branched on `design ?` and re-rasterized the live
    // renderer instead of using the baked PNG on disk, so every export of a
    // designer-saved badge shipped without the iTXt credential. Both PNG paths
    // must always forward the on-disk imageUri, even when `design` is set.
    it.each([
      {
        row: "share-row-verifiable",
        fn: () => mockExportVerifiableBadge,
        args: ["file:///badges/badge.png", "Learn TypeScript"],
      },
      {
        row: "share-row-image",
        fn: () => mockExportImage,
        args: ["file:///badges/badge.png"],
      },
    ])(
      "$row exports the baked PNG on disk even when a design is set",
      ({ row, fn, args }) => {
        mockUseQuery.mockReturnValue([
          makeRow({ imageUri: "file:///badges/badge.png", design: designJSON }),
        ]);

        renderWithProviders(
          <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
        );
        openSheet();
        fireEvent.press(screen.getByTestId(row));

        expect(fn()).toHaveBeenCalledTimes(1);
        expect(fn()).toHaveBeenCalledWith(...args);
      },
    );

    // The lossy path stays honest about what it costs — the warning rides the
    // row's own a11y label, so screen-reader users get it too.
    it("keeps the save-as-image trade-off in the row's announcement", () => {
      mockUseQuery.mockReturnValue([
        makeRow({ imageUri: "file:///badges/badge.png" }),
      ]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      openSheet();

      expect(
        screen.getByTestId("share-row-image").props.accessibilityLabel,
      ).toMatch(/may drop the credential/);
    });
  });

  describe("proof spine", () => {
    const credentialWith = (evidence: unknown[], narrative = "Did it.") =>
      JSON.stringify({
        credentialSubject: {
          achievement: { criteria: { narrative } },
        },
        evidence,
      });

    it("renders a proof card per evidence item, with its translated type label", () => {
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
      // Singular: "1 evidence item", not "1 evidence items".
      expect(
        screen.getByLabelText("Proof gallery, 1 evidence item"),
      ).toBeOnTheScreen();
    });

    // The credential bakes ids as `urn:ulid:<ulid>`, but EvidenceViewer matches
    // the live evidence rows' bare ULID. Passing the prefixed id through would
    // miss and silently land the viewer on the first item, not the tapped one.
    it("opens the tapped evidence in EvidenceViewer with the urn: prefix stripped", () => {
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
      mockUseQuery.mockReturnValue([
        makeRow({ credential, goalId: "goal-42" }),
      ]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      fireEvent.press(
        screen.getByLabelText("Build a small app, submitted as Photo"),
      );

      expect(mockParentNavigate).toHaveBeenCalledWith("GoalsTab", {
        screen: "EvidenceViewer",
        params: { goalId: "goal-42", initialEvidenceId: "ev-2" },
        initial: false,
      });
    });

    it("passes an unprefixed evidence id through untouched", () => {
      const credential = credentialWith([
        {
          id: "ev-raw",
          type: ["Evidence"],
          name: "Legacy step",
          genre: "text",
        },
      ]);
      mockUseQuery.mockReturnValue([
        makeRow({ credential, goalId: "goal-42" }),
      ]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      fireEvent.press(screen.getByLabelText("Legacy step, submitted as Note"));

      expect(mockParentNavigate).toHaveBeenCalledWith(
        "GoalsTab",
        expect.objectContaining({
          params: { goalId: "goal-42", initialEvidenceId: "ev-raw" },
        }),
      );
    });

    // Same failure family as "View timeline" hiding for a soft-deleted goal:
    // the destination needs live goal data that no longer surfaces.
    it("no-ops safely when the badge's goal is soft-deleted (null goalId)", () => {
      const credential = credentialWith([
        {
          id: "urn:ulid:ev-1",
          type: ["Evidence"],
          name: "Watch intro video",
          genre: "video",
        },
      ]);
      mockUseQuery.mockReturnValue([makeRow({ credential, goalId: null })]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(() =>
        fireEvent.press(
          screen.getByLabelText("Watch intro video, submitted as Video"),
        ),
      ).not.toThrow();
      expect(mockParentNavigate).not.toHaveBeenCalled();
    });

    it("no-ops safely when the tab parent is unavailable", () => {
      mockGetParent.mockReturnValueOnce(
        undefined as unknown as ReturnType<typeof mockGetParent>,
      );
      const credential = credentialWith([
        {
          id: "urn:ulid:ev-1",
          type: ["Evidence"],
          name: "Watch intro video",
          genre: "video",
        },
      ]);
      mockUseQuery.mockReturnValue([
        makeRow({ credential, goalId: "goal-42" }),
      ]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(() =>
        fireEvent.press(
          screen.getByLabelText("Watch intro video, submitted as Video"),
        ),
      ).not.toThrow();
      expect(mockParentNavigate).not.toHaveBeenCalled();
    });

    // #411's hard rule: absent evidence is named honestly in the gallery
    // itself, never as a "missing"/"needed" prompt elsewhere on the page.
    it("shows the gallery's own empty state when the credential carries no evidence", () => {
      const credential = JSON.stringify({
        credentialSubject: { achievement: { criteria: {} } },
      });
      mockUseQuery.mockReturnValue([makeRow({ credential })]);

      renderWithProviders(
        <BadgeDetailScreen route={mockRoute} navigation={{} as never} />,
      );
      expect(
        screen.getByText(
          "No evidence was attached to this goal — nothing to show in the gallery.",
        ),
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
