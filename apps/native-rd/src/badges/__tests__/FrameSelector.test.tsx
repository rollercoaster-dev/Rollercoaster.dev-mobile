import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../__tests__/test-utils";
import { FrameSelector } from "../FrameSelector";
import { BadgeFrame } from "../types";

const ALL_FRAMES = Object.values(BadgeFrame) as BadgeFrame[];

const FRAME_LABELS: Record<BadgeFrame, string> = {
  none: "None",
  boldBorder: "Bold Border",
  guilloche: "Guilloche",
  crossHatch: "Cross Hatch",
  microprint: "Microprint",
  rosette: "Rosette",
};

describe("FrameSelector", () => {
  const onSelectFrame = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all 6 frame options", () => {
    renderWithProviders(
      <FrameSelector
        selectedFrame={BadgeFrame.none}
        onSelectFrame={onSelectFrame}
      />,
    );

    for (const frame of ALL_FRAMES) {
      expect(
        screen.getByLabelText(`${FRAME_LABELS[frame]} frame`),
      ).toBeOnTheScreen();
    }
  });

  it("has radiogroup accessibility on container", () => {
    renderWithProviders(
      <FrameSelector
        selectedFrame={BadgeFrame.none}
        onSelectFrame={onSelectFrame}
      />,
    );

    expect(screen.getByLabelText("Badge frame")).toBeOnTheScreen();
    expect(screen.getByLabelText("Badge frame").props.accessibilityRole).toBe(
      "radiogroup",
    );
  });

  test.each(ALL_FRAMES)("marks %s as checked when selected", (frame) => {
    renderWithProviders(
      <FrameSelector selectedFrame={frame} onSelectFrame={onSelectFrame} />,
    );

    const radio = screen.getByLabelText(`${FRAME_LABELS[frame]} frame`);
    expect(radio.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true }),
    );
  });

  it("marks non-selected frames as unchecked", () => {
    renderWithProviders(
      <FrameSelector
        selectedFrame={BadgeFrame.none}
        onSelectFrame={onSelectFrame}
      />,
    );

    const boldRadio = screen.getByLabelText("Bold Border frame");
    expect(boldRadio.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: false }),
    );
  });

  it("calls onSelectFrame when a frame is pressed", () => {
    renderWithProviders(
      <FrameSelector
        selectedFrame={BadgeFrame.none}
        onSelectFrame={onSelectFrame}
      />,
    );

    fireEvent.press(screen.getByLabelText("Guilloche frame"));
    expect(onSelectFrame).toHaveBeenCalledWith(BadgeFrame.guilloche);
  });
});
