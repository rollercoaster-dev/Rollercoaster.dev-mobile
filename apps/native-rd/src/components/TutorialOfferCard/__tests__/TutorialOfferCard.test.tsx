import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { TutorialOfferCard } from "../TutorialOfferCard";

describe("TutorialOfferCard", () => {
  it("reports a start tap and a decline tap to separate handlers", () => {
    const onStart = jest.fn();
    const onDismiss = jest.fn();
    renderWithProviders(
      <TutorialOfferCard onStart={onStart} onDismiss={onDismiss} />,
    );

    fireEvent.press(screen.getByTestId("tutorial-offer-start"));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("tutorial-offer-dismiss"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("names both actions and tells a screen reader the decline is not final", () => {
    renderWithProviders(
      <TutorialOfferCard onStart={jest.fn()} onDismiss={jest.fn()} />,
    );

    expect(
      screen.getByRole("button", {
        name: i18n.t("goals:tutorialOffer.start"),
      }),
    ).toBeOnTheScreen();
    const dismiss = screen.getByRole("button", {
      name: i18n.t("goals:tutorialOffer.dismiss"),
    });
    expect(dismiss.props.accessibilityHint).toBe(
      i18n.t("goals:tutorialOffer.dismissHint"),
    );
    expect(
      screen.getByRole("header", {
        name: i18n.t("goals:tutorialOffer.title"),
      }),
    ).toBeOnTheScreen();
  });
});
