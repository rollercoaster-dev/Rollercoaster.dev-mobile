import React from "react";
import {
  fireEvent,
  renderWithProviders,
  screen,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { FullTitleButton } from "../FullTitleButton";

describe("FullTitleButton", () => {
  it("opens and closes a scrollable full-title view", () => {
    const title = "A very long goal title that should remain fully readable";
    const { rerender } = renderWithProviders(
      <FullTitleButton title={title} kind="goal" testID="read-title" />,
    );

    const trigger = screen.getByTestId("read-title");
    expect(trigger.props.accessibilityHint).toBe(title);
    expect(screen.queryByTestId("read-title-full-title")).toBeNull();

    fireEvent.press(trigger);
    expect(screen.getByTestId("read-title-full-title").props.children).toBe(
      title,
    );
    rerender(
      <FullTitleButton
        title="A different synced goal title"
        kind="goal"
        testID="read-title"
      />,
    );
    expect(screen.getByTestId("read-title-full-title").props.children).toBe(
      title,
    );
    fireEvent.press(screen.getByTestId("read-title-close"));
    expect(screen.queryByTestId("read-title-full-title")).toBeNull();
  });

  it("localizes the visible affordance", async () => {
    await i18n.changeLanguage("de");
    try {
      renderWithProviders(
        <FullTitleButton
          title="Ein langes Ziel"
          kind="goal"
          testID="read-title"
        />,
      );
      expect(
        screen.getByText(i18n.t("common:fullTitle.read.goal")),
      ).toBeOnTheScreen();
      fireEvent.press(screen.getByTestId("read-title"));
      expect(
        screen.getByText(i18n.t("common:fullTitle.heading")),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId("read-title-close").props.accessibilityLabel,
      ).toBe(i18n.t("common:actions.close"));
    } finally {
      await i18n.changeLanguage("en");
    }
  });
});
