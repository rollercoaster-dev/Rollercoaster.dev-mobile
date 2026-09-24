import React from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { renderWithProviders, screen } from "../../../__tests__/test-utils";
import { FieldError } from "../FieldError";

describe("FieldError", () => {
  it("renders readable text in an Android live region", () => {
    renderWithProviders(<FieldError message="Check this field" />);
    expect(screen.getByText("Check this field")).toHaveProp(
      "accessibilityLiveRegion",
      "polite",
    );
  });

  it("announces a new message on iOS", () => {
    const announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => {});
    const { rerender } = renderWithProviders(
      <FieldError message="Enter a URL" />,
    );
    if (Platform.OS === "ios") {
      expect(announce).toHaveBeenCalledWith("Enter a URL");
    } else {
      expect(announce).not.toHaveBeenCalled();
    }
    rerender(<FieldError message="Enter a valid URL" />);
    if (Platform.OS === "ios") {
      expect(announce).toHaveBeenLastCalledWith("Enter a valid URL");
    }
    announce.mockRestore();
  });
});
