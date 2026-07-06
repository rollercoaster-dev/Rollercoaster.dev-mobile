import React from "react";
import { ActivityIndicator } from "react-native";

import { renderWithProviders, screen } from "../../../__tests__/test-utils";
import { createDefaultBadgeDesign } from "../../../badges/types";
import { FinishBakingStage } from "../FinishBakingStage";

const badgeDesign = createDefaultBadgeDesign("Rewire the workshop");

describe("FinishBakingStage", () => {
  it("renders the badge preview, spinner, and label", () => {
    renderWithProviders(<FinishBakingStage badgeDesign={badgeDesign} />);
    expect(screen.getByTestId("finish-baking-badge")).toBeOnTheScreen();
    expect(screen.getByText("Baking your badge…")).toBeOnTheScreen();
    // getByType throws if absent, so a truthy result confirms the spinner rendered.
    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it("announces the baking state via a polite live region", () => {
    renderWithProviders(<FinishBakingStage badgeDesign={badgeDesign} />);
    const region = screen.getByTestId("finish-baking-stage");
    expect(region.props.accessibilityLiveRegion).toBe("polite");
    expect(region.props.accessibilityLabel).toBe("Baking your badge…");
  });

  it("uses the provided label", () => {
    renderWithProviders(
      <FinishBakingStage badgeDesign={badgeDesign} label="Sealing it in…" />,
    );
    expect(screen.getByText("Sealing it in…")).toBeOnTheScreen();
  });
});
