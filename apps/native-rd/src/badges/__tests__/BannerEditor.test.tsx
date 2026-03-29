import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../__tests__/test-utils";
import { BannerEditor } from "../BannerEditor";
import { BannerPosition } from "../types";

describe("BannerEditor", () => {
  const onToggle = jest.fn();
  const onChangeText = jest.fn();
  const onChangePosition = jest.fn();

  const defaultProps = {
    enabled: false,
    text: "",
    position: BannerPosition.center,
    onToggle,
    onChangeText,
    onChangePosition,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Toggle
  // ---------------------------------------------------------------------------

  it("renders toggle with checkbox role and label", () => {
    renderWithProviders(<BannerEditor {...defaultProps} />);

    const toggle = screen.getByLabelText("Enable banner");
    expect(toggle).toBeOnTheScreen();
    expect(toggle.props.accessibilityRole).toBe("checkbox");
  });

  it.each([
    { enabled: false, expected: false },
    { enabled: true, expected: true },
  ])(
    "toggle checked is $expected when enabled=$enabled",
    ({ enabled, expected }) => {
      renderWithProviders(<BannerEditor {...defaultProps} enabled={enabled} />);

      expect(
        screen.getByLabelText("Enable banner").props.accessibilityState,
      ).toEqual(expect.objectContaining({ checked: expected }));
    },
  );

  it("calls onToggle with true when disabled toggle pressed", () => {
    renderWithProviders(<BannerEditor {...defaultProps} enabled={false} />);

    fireEvent.press(screen.getByLabelText("Enable banner"));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("calls onToggle with false when enabled toggle pressed", () => {
    renderWithProviders(<BannerEditor {...defaultProps} enabled={true} />);

    fireEvent.press(screen.getByLabelText("Enable banner"));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  // ---------------------------------------------------------------------------
  // Disabled state
  // ---------------------------------------------------------------------------

  it("hides text input and position picker when disabled", () => {
    renderWithProviders(<BannerEditor {...defaultProps} enabled={false} />);

    expect(screen.queryByLabelText("Banner text")).toBeNull();
    expect(screen.queryByLabelText("Banner position")).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Enabled state — text input
  // ---------------------------------------------------------------------------

  it("shows text input when enabled", () => {
    renderWithProviders(<BannerEditor {...defaultProps} enabled={true} />);

    expect(screen.getByLabelText("Banner text")).toBeOnTheScreen();
  });

  it("calls onChangeText when text input changes", () => {
    renderWithProviders(<BannerEditor {...defaultProps} enabled={true} />);

    fireEvent.changeText(screen.getByLabelText("Banner text"), "ACHIEVED");
    expect(onChangeText).toHaveBeenCalledWith("ACHIEVED");
  });

  // ---------------------------------------------------------------------------
  // Position picker
  // ---------------------------------------------------------------------------

  it("renders position picker with radiogroup role when enabled", () => {
    renderWithProviders(<BannerEditor {...defaultProps} enabled={true} />);

    const group = screen.getByLabelText("Banner position");
    expect(group).toBeOnTheScreen();
    expect(group.props.accessibilityRole).toBe("radiogroup");
  });

  it.each([
    { pos: BannerPosition.center, label: "Center position" },
    { pos: BannerPosition.bottom, label: "Bottom position" },
  ])("renders $label option with radio role", ({ label }) => {
    renderWithProviders(<BannerEditor {...defaultProps} enabled={true} />);

    const option = screen.getByLabelText(label);
    expect(option).toBeOnTheScreen();
    expect(option.props.accessibilityRole).toBe("radio");
  });

  it.each([
    { selected: BannerPosition.center, label: "Center position" },
    { selected: BannerPosition.bottom, label: "Bottom position" },
  ])("marks $label as checked when selected", ({ selected, label }) => {
    renderWithProviders(
      <BannerEditor {...defaultProps} enabled={true} position={selected} />,
    );

    expect(screen.getByLabelText(label).props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true }),
    );
  });

  it("marks non-selected position as unchecked", () => {
    renderWithProviders(
      <BannerEditor
        {...defaultProps}
        enabled={true}
        position={BannerPosition.center}
      />,
    );

    expect(
      screen.getByLabelText("Bottom position").props.accessibilityState,
    ).toEqual(expect.objectContaining({ checked: false }));
  });

  it("pressing a position option calls onChangePosition", () => {
    renderWithProviders(<BannerEditor {...defaultProps} enabled={true} />);

    fireEvent.press(screen.getByLabelText("Bottom position"));
    expect(onChangePosition).toHaveBeenCalledWith(BannerPosition.bottom);
  });
});
