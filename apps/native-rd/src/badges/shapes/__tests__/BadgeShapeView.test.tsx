import React from "react";
import { renderWithProviders, screen } from "../../../__tests__/test-utils";
import { BadgeShapeView } from "../BadgeShapeView";
import { BadgeShape } from "../../types";

describe("BadgeShapeView", () => {
  it("announces roundedRect by its display name, not the raw id (#872)", () => {
    renderWithProviders(
      <BadgeShapeView shape={BadgeShape.roundedRect} fillColor="#ffffff" />,
    );
    expect(screen.getByLabelText("Rounded Rect shape")).toBeOnTheScreen();
  });

  it("drops its label when decorative, so a labelled parent isn't doubled", () => {
    renderWithProviders(
      <BadgeShapeView
        decorative
        shape={BadgeShape.roundedRect}
        fillColor="#ffffff"
      />,
    );
    expect(screen.queryByLabelText("Rounded Rect shape")).toBeNull();
  });
});
