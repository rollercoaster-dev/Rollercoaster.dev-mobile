import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { FABMenu } from "../FABMenu";

const defaultProps = {
  isOpen: true,
  onSelectType: jest.fn(),
};

describe("FABMenu", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders all 7 evidence types when open", () => {
    renderWithProviders(<FABMenu {...defaultProps} />);
    expect(screen.getByText("Photo")).toBeOnTheScreen();
    expect(screen.getByText("Screenshot")).toBeOnTheScreen();
    expect(screen.getByText("Video")).toBeOnTheScreen();
    expect(screen.getByText("Note")).toBeOnTheScreen();
    expect(screen.getByText("Voice Memo")).toBeOnTheScreen();
    expect(screen.getByText("Link")).toBeOnTheScreen();
    expect(screen.getByText("File")).toBeOnTheScreen();
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
    expect(screen.getAllByRole("menuitem")).toHaveLength(7);
  });
});
