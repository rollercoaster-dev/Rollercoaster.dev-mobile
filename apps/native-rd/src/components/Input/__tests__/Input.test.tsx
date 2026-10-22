import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { Input } from "../Input";
import { composeTheme } from "../../../themes/compose";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const unistylesMock = require("react-native-unistyles");

describe("Input", () => {
  it("renders label when provided", () => {
    renderWithProviders(<Input label="Username" />);
    expect(screen.getByText("Username")).toBeOnTheScreen();
  });

  it("renders without label element when no label provided", () => {
    renderWithProviders(<Input placeholder="Enter text" />);
    expect(screen.queryByText("Username")).toBeNull();
  });

  it("renders placeholder text", () => {
    renderWithProviders(<Input placeholder="Search…" />);
    expect(screen.getByPlaceholderText("Search…")).toBeOnTheScreen();
  });

  it("calls onChangeText when user types", () => {
    const onChangeText = jest.fn();
    renderWithProviders(
      <Input placeholder="Type here" onChangeText={onChangeText} />,
    );
    fireEvent.changeText(screen.getByPlaceholderText("Type here"), "hello");
    expect(onChangeText).toHaveBeenCalledWith("hello");
  });

  it("renders error message when error prop is set", () => {
    renderWithProviders(<Input placeholder="Field" error="Required field" />);
    expect(screen.getByText("Required field")).toBeOnTheScreen();
  });

  it("does not render error element when no error", () => {
    renderWithProviders(<Input placeholder="Field" />);
    expect(screen.queryByText("Required field")).toBeNull();
  });

  it("uses label as accessibilityLabel when both label and placeholder are provided", () => {
    renderWithProviders(<Input label="Email" placeholder="you@example.com" />);
    expect(screen.getByLabelText("Email")).toBeOnTheScreen();
  });

  it("falls back to placeholder as accessibilityLabel when no label provided", () => {
    renderWithProviders(<Input placeholder="Search…" />);
    expect(screen.getByLabelText("Search…")).toBeOnTheScreen();
  });

  it("sets accessibilityState.disabled=true when editable=false", () => {
    renderWithProviders(<Input placeholder="Read only" editable={false} />);
    expect(screen.getByPlaceholderText("Read only")).toHaveProp(
      "accessibilityState",
      {
        disabled: true,
      },
    );
  });

  it("sets accessibilityState.disabled=false when editable is not set", () => {
    renderWithProviders(<Input placeholder="Normal" />);
    expect(screen.getByPlaceholderText("Normal")).toHaveProp(
      "accessibilityState",
      {
        disabled: false,
      },
    );
  });

  describe("maxFontSizeMultiplier", () => {
    afterEach(() => {
      unistylesMock.useUnistyles.mockReturnValue({
        theme: unistylesMock.mockTheme,
        rt: unistylesMock.UnistylesRuntime,
      });
    });

    // Body, label and caption share the 2.0 cap today, so these pin "capped
    // and composed with the theme scale" rather than which role each part uses.
    it("caps the field at body, the label at label and the error at caption", () => {
      renderWithProviders(
        <Input label="Name" placeholder="Your name" error="Required" />,
      );
      expect(
        screen.getByPlaceholderText("Your name").props.maxFontSizeMultiplier,
      ).toBe(2);
      expect(screen.getByText("Name").props.maxFontSizeMultiplier).toBe(2);
      expect(screen.getByText("Required").props.maxFontSizeMultiplier).toBe(2);
    });

    it("divides each cap by Low Vision's 1.25x theme scale", () => {
      unistylesMock.useUnistyles.mockReturnValue({
        theme: composeTheme("light", "lowVision"),
      });
      renderWithProviders(
        <Input label="Name" placeholder="Your name" error="Required" />,
      );
      for (const node of [
        screen.getByPlaceholderText("Your name"),
        screen.getByText("Name"),
        screen.getByText("Required"),
      ]) {
        expect(node.props.maxFontSizeMultiplier).toBeCloseTo(1.6);
      }
    });

    it("lets an explicit caller value win on the field", () => {
      renderWithProviders(
        <Input placeholder="Code" maxFontSizeMultiplier={1.2} />,
      );
      expect(
        screen.getByPlaceholderText("Code").props.maxFontSizeMultiplier,
      ).toBe(1.2);
    });
  });
});
