import React from "react";
import { StyleSheet } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { Input } from "../Input";
import { mockTheme } from "../../../__tests__/mocks/unistyles";

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
    expect(screen.getByPlaceholderText("Field")).toHaveProp(
      "accessibilityHint",
      "Required field",
    );
  });

  it("restores the normal accessibility hint when the error clears", () => {
    const { rerender } = renderWithProviders(
      <Input label="Field" error="Required field" accessibilityHint="Help" />,
    );
    expect(screen.getByLabelText("Field")).toHaveProp(
      "accessibilityHint",
      "Required field",
    );
    rerender(<Input label="Field" accessibilityHint="Help" />);
    expect(screen.getByLabelText("Field")).toHaveProp(
      "accessibilityHint",
      "Help",
    );
  });

  it("uses the semantic error border until the field is corrected", () => {
    const { rerender } = renderWithProviders(
      <Input label="Field" error="Required field" />,
    );
    const field = screen.getByLabelText("Field");
    expect(StyleSheet.flatten(field.props.style).borderColor).toBe(
      mockTheme.colors.error,
    );
    rerender(<Input label="Field" />);
    expect(StyleSheet.flatten(field.props.style).borderColor).toBe(
      mockTheme.colors.border,
    );
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
});
