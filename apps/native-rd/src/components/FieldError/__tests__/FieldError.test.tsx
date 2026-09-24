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
    const platformStub = jest.replaceProperty(Platform, "OS", "ios");
    const announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => {});
    const { rerender } = renderWithProviders(
      <FieldError message="Enter a URL" />,
    );
    expect(announce).toHaveBeenCalledWith("Enter a URL");
    rerender(<FieldError message="Enter a valid URL" />);
    expect(announce).toHaveBeenLastCalledWith("Enter a valid URL");
    announce.mockRestore();
    platformStub.restore();
  });

  it("lets Android announce through the live region without duplicate speech", () => {
    const platformStub = jest.replaceProperty(Platform, "OS", "android");
    const announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => {});
    renderWithProviders(<FieldError message="Check this field" />);
    expect(announce).not.toHaveBeenCalled();
    expect(screen.getByText("Check this field")).toHaveProp(
      "accessibilityLiveRegion",
      "polite",
    );
    announce.mockRestore();
    platformStub.restore();
  });
});
