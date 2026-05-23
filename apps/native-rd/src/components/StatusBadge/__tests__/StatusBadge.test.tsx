import React from "react";
import { renderWithProviders, screen } from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { StatusBadge } from "../StatusBadge";

describe("StatusBadge", () => {
  it("renders the default label for a variant", () => {
    renderWithProviders(<StatusBadge variant="active" />);
    expect(screen.getByText(i18n.t("common:status.active"))).toBeOnTheScreen();
  });

  it("renders a custom label when provided", () => {
    renderWithProviders(<StatusBadge variant="completed" label="Finished" />);
    expect(screen.getByText("Finished")).toBeOnTheScreen();
  });

  it("has accessible status label", () => {
    renderWithProviders(<StatusBadge variant="locked" />);
    expect(
      screen.getByLabelText(
        i18n.t("common:status.a11yPrefix", {
          label: i18n.t("common:status.locked"),
        }),
      ),
    ).toBeOnTheScreen();
  });
});
