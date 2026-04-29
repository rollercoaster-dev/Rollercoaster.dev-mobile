import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { FABMenu } from "../FABMenu";
import { EVIDENCE_CAPTURE_OPTIONS } from "../../../types/evidence";

const defaultProps = {
  isOpen: true,
  onSelectType: jest.fn(),
};

describe("FABMenu", () => {
  beforeEach(() => jest.clearAllMocks());

  test.each(EVIDENCE_CAPTURE_OPTIONS.map((o) => [o.type, o.label] as const))(
    "renders capture option for %s",
    (_type, label) => {
      renderWithProviders(<FABMenu {...defaultProps} />);
      expect(screen.getByText(label)).toBeOnTheScreen();
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
    expect(screen.queryByText("Photo")).not.toBeOnTheScreen();
  });

  it("calls onSelectType with correct type on press", () => {
    const onSelectType = jest.fn();
    renderWithProviders(<FABMenu isOpen onSelectType={onSelectType} />);
    fireEvent.press(screen.getByLabelText("Note"));
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
});
