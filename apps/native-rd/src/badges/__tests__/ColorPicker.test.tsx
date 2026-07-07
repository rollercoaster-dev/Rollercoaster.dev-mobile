import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../__tests__/test-utils";
import { ColorPicker } from "../ColorPicker";
import { mockTheme } from "../../__tests__/mocks/unistyles";

describe("ColorPicker", () => {
  const onSelectColor = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all 7 accent color swatches with labels", () => {
    renderWithProviders(
      <ColorPicker selectedColor="#a78bfa" onSelectColor={onSelectColor} />,
    );

    const labels = [
      "Purple",
      "Mint",
      "Yellow",
      "Emerald",
      "Teal",
      "Orange",
      "Sky",
    ];
    for (const label of labels) {
      expect(screen.getByLabelText(`${label} color`)).toBeOnTheScreen();
    }
  });

  it("has radiogroup accessibility on container", () => {
    renderWithProviders(
      <ColorPicker selectedColor="#a78bfa" onSelectColor={onSelectColor} />,
    );

    expect(screen.getByLabelText("Badge color")).toBeOnTheScreen();
    expect(screen.getByLabelText("Badge color").props.accessibilityRole).toBe(
      "radiogroup",
    );
  });

  it("prepends goal color swatch when goalColor is provided", () => {
    renderWithProviders(
      <ColorPicker
        selectedColor="#a78bfa"
        onSelectColor={onSelectColor}
        goalColor="#ff0000"
      />,
    );

    expect(screen.getByLabelText("Goal color")).toBeOnTheScreen();
  });

  it("does not render goal color swatch when goalColor is not provided", () => {
    renderWithProviders(
      <ColorPicker selectedColor="#a78bfa" onSelectColor={onSelectColor} />,
    );

    expect(screen.queryByLabelText("Goal color")).toBeNull();
  });

  it("suppresses the goal swatch when goalColor duplicates a palette accent", () => {
    // #34d399 is the Mint accent — prepending a "goal" swatch here would put a
    // duplicate hex in the radiogroup, so it must fall through to the palette.
    renderWithProviders(
      <ColorPicker
        selectedColor="#34d399"
        onSelectColor={onSelectColor}
        goalColor="#34d399"
      />,
    );

    expect(screen.queryByLabelText("Goal color")).toBeNull();
    // The single surviving Mint swatch stays the one flagged checked.
    expect(
      screen.getByLabelText("Mint color").props.accessibilityState,
    ).toEqual(expect.objectContaining({ checked: true }));
  });

  it("suppresses the goal swatch regardless of hex casing", () => {
    renderWithProviders(
      <ColorPicker
        selectedColor="#34d399"
        onSelectColor={onSelectColor}
        goalColor="#34D399"
      />,
    );

    expect(screen.queryByLabelText("Goal color")).toBeNull();
  });

  it("marks selected color as checked", () => {
    renderWithProviders(
      <ColorPicker selectedColor="#34d399" onSelectColor={onSelectColor} />,
    );

    const mintRadio = screen.getByLabelText("Mint color");
    expect(mintRadio.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true }),
    );
  });

  it("marks non-selected colors as unchecked", () => {
    renderWithProviders(
      <ColorPicker selectedColor="#a78bfa" onSelectColor={onSelectColor} />,
    );

    const tealRadio = screen.getByLabelText("Teal color");
    expect(tealRadio.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: false }),
    );
  });

  it("calls onSelectColor with correct hex when pressed", () => {
    renderWithProviders(
      <ColorPicker selectedColor="#a78bfa" onSelectColor={onSelectColor} />,
    );

    fireEvent.press(screen.getByLabelText("Orange color"));
    expect(onSelectColor).toHaveBeenCalledWith("#f97316");
  });

  // Locating the swatch ring directly is awkward — the inner <View> with the
  // ring style is unlabelled. Walk the Pressable's children until we hit the
  // node carrying `borderColor` and pull it off there. Keeps the test tied to
  // the actual rendered style rather than the source code.
  function getRingBorderColor(
    swatchPressable: ReturnType<typeof screen.getByLabelText>,
  ): unknown {
    function find(node: unknown): Record<string, unknown> | null {
      if (!node || typeof node !== "object") return null;
      const n = node as { props?: Record<string, unknown>; children?: unknown };
      if (n.props) {
        const style = n.props.style;
        const styles = Array.isArray(style) ? style : style ? [style] : [];
        for (const s of styles) {
          if (s && typeof s === "object" && "borderColor" in s) {
            return s as Record<string, unknown>;
          }
        }
      }
      const children = n.children;
      const list = Array.isArray(children)
        ? children
        : children
          ? [children]
          : [];
      for (const c of list) {
        const hit = find(c);
        if (hit) return hit;
      }
      return null;
    }
    return find(swatchPressable)?.borderColor ?? null;
  }

  it("uses theme.colors.accentPrimary for the selected swatch ring", () => {
    renderWithProviders(
      <ColorPicker selectedColor="#34d399" onSelectColor={onSelectColor} />,
    );
    const ringColor = getRingBorderColor(screen.getByLabelText("Mint color"));
    expect(ringColor).toBe(mockTheme.colors.accentPrimary);
  });

  it("renders the Custom… trigger when onOpenCustomPicker is provided", () => {
    renderWithProviders(
      <ColorPicker
        selectedColor="#a78bfa"
        onSelectColor={onSelectColor}
        onOpenCustomPicker={jest.fn()}
      />,
    );
    expect(screen.getByTestId("color-picker-custom")).toBeOnTheScreen();
  });

  it("does not render the Custom… trigger when onOpenCustomPicker is omitted", () => {
    renderWithProviders(
      <ColorPicker selectedColor="#a78bfa" onSelectColor={onSelectColor} />,
    );
    expect(screen.queryByTestId("color-picker-custom")).toBeNull();
  });

  it("calls onOpenCustomPicker when the Custom… trigger is pressed", () => {
    const onOpenCustomPicker = jest.fn();
    renderWithProviders(
      <ColorPicker
        selectedColor="#a78bfa"
        onSelectColor={onSelectColor}
        onOpenCustomPicker={onOpenCustomPicker}
      />,
    );
    fireEvent.press(screen.getByTestId("color-picker-custom"));
    expect(onOpenCustomPicker).toHaveBeenCalledTimes(1);
  });

  it("highlights the Custom… cell when the selected color is not in the palette", () => {
    renderWithProviders(
      <ColorPicker
        selectedColor="#abcdef"
        onSelectColor={onSelectColor}
        onOpenCustomPicker={jest.fn()}
      />,
    );
    const ringColor = getRingBorderColor(
      screen.getByTestId("color-picker-custom"),
    );
    expect(ringColor).toBe(mockTheme.colors.accentPrimary);
  });
});
