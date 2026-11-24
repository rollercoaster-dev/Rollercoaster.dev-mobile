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

  // Color is never the only signal: words plus an icon, the icon hidden
  // from screen readers since the message already says it.
  it("shows the message as text beside a hidden warning icon", () => {
    renderWithProviders(
      <FieldError message="Add a web address" testID="url-error" />,
    );
    expect(screen.getByText("Add a web address")).toBeOnTheScreen();
    expect(
      screen.getByTestId("url-error-icon", { includeHiddenElements: true }),
    ).toHaveProp("accessibilityElementsHidden", true);
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
