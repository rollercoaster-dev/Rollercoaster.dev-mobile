import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../__tests__/test-utils";
import { PathTextEditor } from "../PathTextEditor";
import { getPathTextMaxChars } from "../text/pathTextLimits";
import { BadgeShape, PathTextPosition } from "../types";
import { mockTheme } from "../../__tests__/mocks/unistyles";
import { findRingBorderColor } from "./selector-test-helpers";

describe("PathTextEditor", () => {
  const onToggle = jest.fn();
  const onChangeText = jest.fn();
  const onChangeTextBottom = jest.fn();
  const onChangePosition = jest.fn();

  const defaultProps = {
    enabled: false,
    text: "",
    textBottom: "",
    position: PathTextPosition.top,
    shape: BadgeShape.circle,
    goalTitle: "My Goal",
    onToggle,
    onChangeText,
    onChangeTextBottom,
    onChangePosition,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Toggle
  // ---------------------------------------------------------------------------

  it("renders toggle with checkbox role and label", () => {
    renderWithProviders(<PathTextEditor {...defaultProps} />);

    const toggle = screen.getByLabelText("Enable path text");
    expect(toggle).toBeOnTheScreen();
    expect(toggle.props.accessibilityRole).toBe("checkbox");
  });

  it.each([
    { enabled: false, expected: false },
    { enabled: true, expected: true },
  ])(
    "toggle checked is $expected when enabled=$enabled",
    ({ enabled, expected }) => {
      renderWithProviders(
        <PathTextEditor {...defaultProps} enabled={enabled} />,
      );

      expect(
        screen.getByLabelText("Enable path text").props.accessibilityState,
      ).toEqual(expect.objectContaining({ checked: expected }));
    },
  );

  it("calls onToggle with true when disabled toggle pressed", () => {
    renderWithProviders(<PathTextEditor {...defaultProps} enabled={false} />);

    fireEvent.press(screen.getByLabelText("Enable path text"));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("calls onToggle with false when enabled toggle pressed", () => {
    renderWithProviders(<PathTextEditor {...defaultProps} enabled={true} />);

    fireEvent.press(screen.getByLabelText("Enable path text"));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  // ---------------------------------------------------------------------------
  // Disabled state
  // ---------------------------------------------------------------------------

  it("hides inputs and position picker when disabled", () => {
    renderWithProviders(<PathTextEditor {...defaultProps} enabled={false} />);

    expect(screen.queryByLabelText("Path text")).toBeNull();
    expect(screen.queryByLabelText("Path text position")).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Enabled state — text input
  // ---------------------------------------------------------------------------

  it("shows text input when enabled", () => {
    renderWithProviders(<PathTextEditor {...defaultProps} enabled={true} />);

    expect(screen.getByLabelText("Path text")).toBeOnTheScreen();
  });

  it("uses goalTitle as placeholder for the text input", () => {
    renderWithProviders(
      <PathTextEditor
        {...defaultProps}
        enabled={true}
        goalTitle="Learn Rust"
      />,
    );

    expect(screen.getByLabelText("Path text").props.placeholder).toBe(
      "Learn Rust",
    );
  });

  it("uses goalTitle as placeholder for the bottom text input", () => {
    renderWithProviders(
      <PathTextEditor
        {...defaultProps}
        enabled={true}
        position={PathTextPosition.both}
        goalTitle="Learn Rust"
      />,
    );

    expect(screen.getByLabelText("Path text bottom").props.placeholder).toBe(
      "Learn Rust",
    );
  });

  it("calls onChangeText when text input changes", () => {
    renderWithProviders(<PathTextEditor {...defaultProps} enabled={true} />);

    fireEvent.changeText(screen.getByLabelText("Path text"), "HELLO");
    expect(onChangeText).toHaveBeenCalledWith("HELLO");
  });

  // ---------------------------------------------------------------------------
  // Position picker
  // ---------------------------------------------------------------------------

  it("renders position picker with radiogroup role when enabled", () => {
    renderWithProviders(<PathTextEditor {...defaultProps} enabled={true} />);

    const group = screen.getByLabelText("Path text position");
    expect(group).toBeOnTheScreen();
    expect(group.props.accessibilityRole).toBe("radiogroup");
  });

  it.each([
    { pos: PathTextPosition.top, label: "Top position" },
    { pos: PathTextPosition.bottom, label: "Bottom position" },
    { pos: PathTextPosition.both, label: "Both position" },
  ])("renders $label option with radio role", ({ label }) => {
    renderWithProviders(<PathTextEditor {...defaultProps} enabled={true} />);

    const option = screen.getByLabelText(label);
    expect(option).toBeOnTheScreen();
    expect(option.props.accessibilityRole).toBe("radio");
  });

  it.each([
    { selected: PathTextPosition.top, label: "Top position" },
    { selected: PathTextPosition.bottom, label: "Bottom position" },
    { selected: PathTextPosition.both, label: "Both position" },
  ])("marks $label as checked when selected", ({ selected, label }) => {
    renderWithProviders(
      <PathTextEditor {...defaultProps} enabled={true} position={selected} />,
    );

    expect(screen.getByLabelText(label).props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true }),
    );
  });

  it("marks non-selected positions as unchecked", () => {
    renderWithProviders(
      <PathTextEditor
        {...defaultProps}
        enabled={true}
        position={PathTextPosition.top}
      />,
    );

    expect(
      screen.getByLabelText("Bottom position").props.accessibilityState,
    ).toEqual(expect.objectContaining({ checked: false }));
    expect(
      screen.getByLabelText("Both position").props.accessibilityState,
    ).toEqual(expect.objectContaining({ checked: false }));
  });

  it("pressing a position option calls onChangePosition", () => {
    renderWithProviders(<PathTextEditor {...defaultProps} enabled={true} />);

    fireEvent.press(screen.getByLabelText("Bottom position"));
    expect(onChangePosition).toHaveBeenCalledWith(PathTextPosition.bottom);
  });

  it("active-selection ring uses theme.accentPrimary, not design.color", () => {
    renderWithProviders(
      <PathTextEditor
        {...defaultProps}
        enabled={true}
        position={PathTextPosition.both}
      />,
    );
    const ring = findRingBorderColor(screen.getByLabelText("Both position"));
    expect(ring).toBe(mockTheme.colors.accentPrimary);
  });

  // ---------------------------------------------------------------------------
  // Input visibility per position
  // ---------------------------------------------------------------------------

  it.each([PathTextPosition.top, PathTextPosition.both])(
    "shows top text input when position is %s",
    (pos) => {
      renderWithProviders(
        <PathTextEditor {...defaultProps} enabled={true} position={pos} />,
      );

      expect(screen.getByLabelText("Path text")).toBeOnTheScreen();
    },
  );

  it("hides top text input when position is bottom", () => {
    renderWithProviders(
      <PathTextEditor
        {...defaultProps}
        enabled={true}
        position={PathTextPosition.bottom}
      />,
    );

    expect(screen.queryByLabelText("Path text")).toBeNull();
  });

  it.each([PathTextPosition.bottom, PathTextPosition.both])(
    "shows bottom text input when position is %s",
    (pos) => {
      renderWithProviders(
        <PathTextEditor {...defaultProps} enabled={true} position={pos} />,
      );

      expect(screen.getByLabelText("Path text bottom")).toBeOnTheScreen();
    },
  );

  it("hides bottom text input when position is top", () => {
    renderWithProviders(
      <PathTextEditor
        {...defaultProps}
        enabled={true}
        position={PathTextPosition.top}
      />,
    );

    expect(screen.queryByLabelText("Path text bottom")).toBeNull();
  });

  it("both position shows both inputs", () => {
    renderWithProviders(
      <PathTextEditor
        {...defaultProps}
        enabled={true}
        position={PathTextPosition.both}
      />,
    );

    expect(screen.getByLabelText("Path text")).toBeOnTheScreen();
    expect(screen.getByLabelText("Path text bottom")).toBeOnTheScreen();
  });

  // ---------------------------------------------------------------------------
  // Callback routing per position
  // ---------------------------------------------------------------------------

  it("calls onChangeTextBottom when bottom position selected and user types", () => {
    renderWithProviders(
      <PathTextEditor
        {...defaultProps}
        enabled={true}
        position={PathTextPosition.bottom}
      />,
    );

    fireEvent.changeText(screen.getByLabelText("Path text bottom"), "WORLD");
    expect(onChangeTextBottom).toHaveBeenCalledWith("WORLD");
    expect(onChangeText).not.toHaveBeenCalled();
  });

  it("calls onChangeText for top input in both mode", () => {
    renderWithProviders(
      <PathTextEditor
        {...defaultProps}
        enabled={true}
        position={PathTextPosition.both}
      />,
    );

    fireEvent.changeText(screen.getByLabelText("Path text"), "TOP");
    expect(onChangeText).toHaveBeenCalledWith("TOP");
  });

  it("calls onChangeTextBottom for bottom input in both mode", () => {
    renderWithProviders(
      <PathTextEditor
        {...defaultProps}
        enabled={true}
        position={PathTextPosition.both}
      />,
    );

    fireEvent.changeText(screen.getByLabelText("Path text bottom"), "BOTTOM");
    expect(onChangeTextBottom).toHaveBeenCalledWith("BOTTOM");
  });

  // -------------------------------------------------------------------------
  // Character counter feedback
  // -------------------------------------------------------------------------

  it("renders a top counter whose max matches getPathTextMaxChars(shape, 'top')", () => {
    const shape = BadgeShape.circle;
    const expectedMax = getPathTextMaxChars(shape, "top");

    renderWithProviders(
      <PathTextEditor
        {...defaultProps}
        enabled={true}
        shape={shape}
        text="HELLO"
      />,
    );

    expect(
      screen.getByLabelText(`Top: 5 of ${expectedMax} characters used`),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText("Path text").props.maxLength).toBe(
      expectedMax,
    );
  });

  it("renders a bottom counter whose max matches getPathTextMaxChars(shape, 'bottom')", () => {
    const shape = BadgeShape.star;
    const expectedMax = getPathTextMaxChars(shape, "bottom");

    renderWithProviders(
      <PathTextEditor
        {...defaultProps}
        enabled={true}
        shape={shape}
        position={PathTextPosition.both}
        text="TOP"
        textBottom="BTM"
      />,
    );

    expect(
      screen.getByLabelText(`Bottom: 3 of ${expectedMax} characters used`),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText("Path text bottom").props.maxLength).toBe(
      expectedMax,
    );
  });

  it("uses tighter caps on diamond than on star", () => {
    expect(getPathTextMaxChars(BadgeShape.diamond, "top")).toBeLessThan(
      getPathTextMaxChars(BadgeShape.star, "top"),
    );
  });
});
