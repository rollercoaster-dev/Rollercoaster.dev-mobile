import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../__tests__/test-utils";
import { PathTextEditor } from "../PathTextEditor";
import { PathTextPosition } from "../types";

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
});
