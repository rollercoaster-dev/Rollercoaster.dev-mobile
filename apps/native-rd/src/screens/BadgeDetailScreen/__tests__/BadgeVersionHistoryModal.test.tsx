import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import {
  BadgeVersionHistoryModal,
  type BadgeVersionRow,
} from "../BadgeVersionHistoryModal";

jest.mock("../../../hooks/useCreateBadge", () => ({
  PLACEHOLDER_IMAGE_URI: "pending:baked-image",
}));

const makeRow = (
  overrides: Partial<BadgeVersionRow> = {},
): BadgeVersionRow => ({
  id: "badge-1",
  credential: JSON.stringify({
    "@context": [],
    type: ["VerifiableCredential"],
    validFrom: "2026-05-14T10:00:00.000Z",
    evidence: [{ id: "urn:ulid:ev-1" }],
  }),
  imageUri: "file:///badges/v1.png",
  createdAt: "2026-05-14T10:00:00.000Z",
  isDeleted: null,
  ...overrides,
});

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  goalTitle: "Learn TypeScript",
};

describe("BadgeVersionHistoryModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not render content when visible is false", () => {
    renderWithProviders(
      <BadgeVersionHistoryModal
        {...defaultProps}
        visible={false}
        versions={[makeRow()]}
      />,
    );
    expect(screen.queryByText("Version history")).not.toBeOnTheScreen();
  });

  it("renders a row for each version, newest-first numbering (v{N} down to v1)", () => {
    const versions: BadgeVersionRow[] = [
      makeRow({ id: "badge-3", isDeleted: null }), // current, v3
      makeRow({ id: "badge-2", isDeleted: 1 }), // v2
      makeRow({ id: "badge-1", isDeleted: 1 }), // v1
    ];
    renderWithProviders(
      <BadgeVersionHistoryModal {...defaultProps} versions={versions} />,
    );
    expect(screen.getByText("v3")).toBeOnTheScreen();
    expect(screen.getByText("v2")).toBeOnTheScreen();
    expect(screen.getByText("v1")).toBeOnTheScreen();
  });

  it("marks the active row with a 'Current' badge", () => {
    const versions: BadgeVersionRow[] = [
      makeRow({ id: "badge-2", isDeleted: null }),
      makeRow({ id: "badge-1", isDeleted: 1 }),
    ];
    renderWithProviders(
      <BadgeVersionHistoryModal {...defaultProps} versions={versions} />,
    );
    expect(screen.getByText("Current")).toBeOnTheScreen();
  });

  it("opens the credential viewer when a row is tapped", () => {
    const versions: BadgeVersionRow[] = [makeRow({ id: "badge-1" })];
    renderWithProviders(
      <BadgeVersionHistoryModal {...defaultProps} versions={versions} />,
    );
    fireEvent.press(screen.getByTestId("badge-version-row-badge-1"));
    expect(screen.getByLabelText("Back to version list")).toBeOnTheScreen();
    expect(screen.getByText("Credential")).toBeOnTheScreen();
  });

  it("closes the credential viewer with the back button", () => {
    const versions: BadgeVersionRow[] = [makeRow({ id: "badge-1" })];
    renderWithProviders(
      <BadgeVersionHistoryModal {...defaultProps} versions={versions} />,
    );
    fireEvent.press(screen.getByTestId("badge-version-row-badge-1"));
    fireEvent.press(screen.getByLabelText("Back to version list"));
    expect(screen.getByText("Version history")).toBeOnTheScreen();
  });

  it("calls onClose when Close button is pressed", () => {
    const onClose = jest.fn();
    renderWithProviders(
      <BadgeVersionHistoryModal
        {...defaultProps}
        onClose={onClose}
        versions={[makeRow()]}
      />,
    );
    fireEvent.press(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("falls back to '?' thumbnail when imageUri is the placeholder sentinel", () => {
    const versions: BadgeVersionRow[] = [
      makeRow({ id: "badge-1", imageUri: "pending:baked-image" }),
    ];
    renderWithProviders(
      <BadgeVersionHistoryModal {...defaultProps} versions={versions} />,
    );
    expect(screen.getByLabelText("Badge thumbnail for v1")).toBeOnTheScreen();
    expect(screen.getByText("?")).toBeOnTheScreen();
  });
});
