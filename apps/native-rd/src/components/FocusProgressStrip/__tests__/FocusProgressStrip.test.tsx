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

  // Out-of-range counts are pulled into `[0, total]`, and the bar's percent
  // reserves the 0%/100% endpoints for the true boundaries — a partial goal
  // never rounds *up* to "complete" (199/200) or *down* to "empty" (1/200) and
  // disagrees with the label. [doneCount, totalCount, expectedLabel, expectedNow]
  const CLAMPED: [number, number, string, number][] = [
    [-3, 5, "0 / 5 done", 0], // negative done clamps to 0
    [7, 5, "5 / 5 done", 100], // done over total clamps to total (reads complete)
    [199, 200, "199 / 200 done", 99], // just shy of done never rounds up to 100
    [1, 200, "1 / 200 done", 1], // barely started never rounds down to 0
  ];
  it.each(CLAMPED)(
    "clamps %i / %i to '%s' with the bar at %i%%",
    (doneCount, totalCount, expectedLabel, expectedNow) => {
      renderWithProviders(
        <FocusProgressStrip doneCount={doneCount} totalCount={totalCount} />,
      );
      expect(screen.getByText(expectedLabel)).toBeTruthy();
      expect(getBar().props.accessibilityValue.now).toBe(expectedNow);
    },
  );

  it("fires onPress exactly once when the strip is tapped", () => {
    const onPress = jest.fn();
    renderWithProviders(
      <FocusProgressStrip doneCount={2} totalCount={5} onPress={onPress} />,
    );
    fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("exposes a button with a non-empty label and a progressbar bar when onPress is set", () => {
    renderWithProviders(
      <FocusProgressStrip doneCount={2} totalCount={5} onPress={jest.fn()} />,
    );
    const strip = screen.getByRole("button");
    expect(strip.props.accessibilityLabel).toBeTruthy();
    expect(getBar().props.accessibilityRole).toBe("progressbar");
  });

  it("renders no phantom button when onPress is omitted, keeping the progressbar readable", () => {
    renderWithProviders(<FocusProgressStrip doneCount={2} totalCount={5} />);
    // A handler-less strip must not expose a non-functional button to the
    // accessibility tree; the count text and progressbar carry the meaning.
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("2 / 5 done")).toBeTruthy();
    expect(getBar().props.accessibilityRole).toBe("progressbar");
  });
});
