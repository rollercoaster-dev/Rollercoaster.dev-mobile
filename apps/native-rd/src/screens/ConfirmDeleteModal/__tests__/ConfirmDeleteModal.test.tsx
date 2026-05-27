import React from "react";
import { renderWithProviders, screen } from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";

describe("ConfirmDeleteModal label i18n fallback (D9)", () => {
  it("falls back to localized common Delete/Cancel labels when none are supplied", () => {
    renderWithProviders(
      <ConfirmDeleteModal
        visible
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
        title="Delete this item?"
        message="This action cannot be undone."
      />,
    );

    screen.getByRole("button", { name: i18n.t("common:actions.delete") });
    screen.getByRole("button", { name: i18n.t("common:actions.cancel") });
  });

  it("uses caller-provided confirmLabel/cancelLabel when supplied", () => {
    renderWithProviders(
      <ConfirmDeleteModal
        visible
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
        title="Delete this item?"
        message="This action cannot be undone."
        confirmLabel="Remove"
        cancelLabel="Keep it"
      />,
    );

    screen.getByRole("button", { name: "Remove" });
    screen.getByRole("button", { name: "Keep it" });
    expect(
      screen.queryByRole("button", { name: i18n.t("common:actions.delete") }),
    ).toBeNull();
  });
});
