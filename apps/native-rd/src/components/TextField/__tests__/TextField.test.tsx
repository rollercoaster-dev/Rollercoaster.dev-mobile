import React from "react";
import { renderWithProviders, screen } from "../../../__tests__/test-utils";
import { TextField } from "../TextField";
import { composeTheme } from "../../../themes/compose";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const unistylesMock = require("react-native-unistyles");

describe("TextField", () => {
  afterEach(() => {
    unistylesMock.useUnistyles.mockReturnValue({
      theme: unistylesMock.mockTheme,
      rt: unistylesMock.UnistylesRuntime,
    });
  });

  it("caps typed text and placeholder at the body cap (2.0)", () => {
    renderWithProviders(<TextField placeholder="What happened?" />);
    expect(
      screen.getByPlaceholderText("What happened?").props.maxFontSizeMultiplier,
    ).toBe(2);
  });

  it("divides the cap by Low Vision's 1.25x theme scale", () => {
    unistylesMock.useUnistyles.mockReturnValue({
      theme: composeTheme("light", "lowVision"),
    });
    renderWithProviders(<TextField placeholder="Step" />);
    expect(
      screen.getByPlaceholderText("Step").props.maxFontSizeMultiplier,
    ).toBeCloseTo(1.6);
  });

  it("lets an explicit caller value win", () => {
    renderWithProviders(
      <TextField placeholder="Code" maxFontSizeMultiplier={1.2} />,
    );
    expect(
      screen.getByPlaceholderText("Code").props.maxFontSizeMultiplier,
    ).toBe(1.2);
  });

  it("passes other props through to the input", () => {
    renderWithProviders(
      <TextField placeholder="Title" value="Beta goal" testID="title-input" />,
    );
    expect(screen.getByTestId("title-input").props.value).toBe("Beta goal");
  });
});
