import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { FABMenu } from "../FABMenu";
import {
  EVIDENCE_CAPTURE_OPTIONS,
  type EvidenceTypeValue,
} from "../../../types/evidence";
import { i18n } from "../../../i18n";
import { evidenceShortLabel } from "../../../i18n/labels";

const shortLabelFor = (type: EvidenceTypeValue) =>
  evidenceShortLabel(i18n.t.bind(i18n), type);

const defaultProps = {
  isOpen: true,
  onSelectType: jest.fn(),
};

describe("FABMenu", () => {
  beforeEach(() => jest.clearAllMocks());

  test.each(EVIDENCE_CAPTURE_OPTIONS.map((o) => [o.type] as const))(
    "renders capture option for %s",
    (type) => {
      renderWithProviders(<FABMenu {...defaultProps} />);
      expect(screen.getByText(shortLabelFor(type))).toBeOnTheScreen();
    },
  );

  it("renders only supported capture options", () => {
    renderWithProviders(<FABMenu {...defaultProps} />);
    expect(screen.getAllByRole("menuitem")).toHaveLength(
      EVIDENCE_CAPTURE_OPTIONS.length,
    );
  });

  it("renders nothing when closed", () => {
    renderWithProviders(<FABMenu isOpen={false} onSelectType={jest.fn()} />);
    expect(screen.queryByText(shortLabelFor("photo"))).not.toBeOnTheScreen();
  });

  it("calls onSelectType with correct type on press", () => {
    const onSelectType = jest.fn();
    renderWithProviders(<FABMenu isOpen onSelectType={onSelectType} />);
    fireEvent.press(screen.getByLabelText(shortLabelFor("text")));
    expect(onSelectType).toHaveBeenCalledWith("text");
  });

  it("has menu accessibility role", () => {
    renderWithProviders(<FABMenu {...defaultProps} />);
    expect(screen.getByRole("menu")).toBeOnTheScreen();
  });

  it("menu items have menuitem role", () => {
    renderWithProviders(<FABMenu {...defaultProps} />);
    expect(screen.getAllByRole("menuitem").length).toBeGreaterThan(0);
  });

  describe("E2E mode gating", () => {
    const originalE2E = process.env.EXPO_PUBLIC_E2E_MODE;
    beforeAll(() => {
      process.env.EXPO_PUBLIC_E2E_MODE = "true";
    });
    afterAll(() => {
      process.env.EXPO_PUBLIC_E2E_MODE = originalE2E;
    });

    it("drops menu wrapper so each menuitem label is reachable", () => {
      renderWithProviders(<FABMenu {...defaultProps} />);
      // Under EXPO_PUBLIC_E2E_MODE=true, the outer menu grouping is
      // disabled so Maestro can resolve each menu item's label
      // (e.g. "Note", "Photo") without colliding with the parent menu's
      // "Add evidence menu" composed label.
      expect(screen.queryByLabelText("Add evidence menu")).toBeNull();
      // Individual menu items remain reachable.
      expect(screen.getAllByRole("menuitem")).toHaveLength(
        EVIDENCE_CAPTURE_OPTIONS.length,
      );
    });
  });
});
