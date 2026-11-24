import React from "react";
import { AccessibilityInfo } from "react-native";
import { renderWithProviders, screen } from "../../../__tests__/test-utils";
import { FieldError } from "../FieldError";

describe("FieldError", () => {
  let announce: jest.SpyInstance;

  beforeEach(() => {
    announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    announce.mockRestore();
  });

  it("shows the message as text, not only as color", () => {
    renderWithProviders(<FieldError message="Add a web address" />);
    expect(screen.getByText("Add a web address")).toBeOnTheScreen();
  });

  it("announces the message when it appears", () => {
    renderWithProviders(<FieldError message="Add a web address" />);
    expect(announce).toHaveBeenCalledWith("Add a web address");
  });

  it("announces again when the message changes, not on every render", () => {
    const { rerender } = renderWithProviders(
      <FieldError message="Add a web address" />,
    );
    rerender(<FieldError message="Add a web address" />);
    expect(announce).toHaveBeenCalledTimes(1);

    rerender(<FieldError message="That isn't a web address yet" />);
    expect(announce).toHaveBeenCalledTimes(2);
    expect(announce).toHaveBeenLastCalledWith("That isn't a web address yet");
  });
});
