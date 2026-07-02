import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { FocusProgressStrip } from "../FocusProgressStrip";

// [doneCount, totalCount, expectedNow] — the fraction drives both the "{done} /
// {total} done" label and the progress bar's accessibilityValue.now (percent).
const FRACTIONS: [number, number, number][] = [
  [0, 5, 0],
  [2, 5, 40],
  [5, 5, 100],
];

// The whole strip is one `accessible` button (the "See all steps" tap target),
// which collapses its children in the accessibility tree — so the inner
// progressbar is not a separate a11y node for a screen reader (the button's
// label carries the fraction). We query it by testID to assert its role and
// value are present as visual/semantic metadata.
const getBar = () => screen.getByTestId("focus-progress-strip-bar");

describe("FocusProgressStrip", () => {
  it.each(FRACTIONS)(
    "renders %i / %i done and a bar at %i%%",
    (doneCount, totalCount, expectedNow) => {
      renderWithProviders(
        <FocusProgressStrip doneCount={doneCount} totalCount={totalCount} />,
      );
      expect(
        screen.getByText(`${doneCount} / ${totalCount} done`),
      ).toBeTruthy();
      expect(getBar().props.accessibilityValue.now).toBe(expectedNow);
    },
  );

  it("clamps a 0-total goal to an empty (not NaN) bar", () => {
    renderWithProviders(<FocusProgressStrip doneCount={0} totalCount={0} />);
    expect(screen.getByText("0 / 0 done")).toBeTruthy();
    expect(getBar().props.accessibilityValue.now).toBe(0);
  });

  it("fires onPress exactly once when the strip is tapped", () => {
    const onPress = jest.fn();
    renderWithProviders(
      <FocusProgressStrip doneCount={2} totalCount={5} onPress={onPress} />,
    );
    fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("exposes a button with a non-empty label and a progressbar bar", () => {
    renderWithProviders(<FocusProgressStrip doneCount={2} totalCount={5} />);
    const strip = screen.getByRole("button");
    expect(strip.props.accessibilityLabel).toBeTruthy();
    expect(getBar().props.accessibilityRole).toBe("progressbar");
  });
});
