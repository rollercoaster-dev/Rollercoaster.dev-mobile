import React from "react";
import { Text as RNText } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { IconButton } from "../../IconButton";
import { ScreenHeader } from "../ScreenHeader";
import { ScreenSubHeader } from "../ScreenSubHeader";

describe("ScreenHeader", () => {
  it("renders the title with header role", () => {
    renderWithProviders(<ScreenHeader title="Goals" />);
    const title = screen.getByText("Goals");
    expect(title).toBeOnTheScreen();
    expect(title.props.accessibilityRole).toBe("header");
  });

  it("renders right slot when provided", () => {
    const onPress = jest.fn();
    renderWithProviders(
      <ScreenHeader
        title="Goals"
        right={
          <IconButton
            icon={<RNText>+</RNText>}
            onPress={onPress}
            accessibilityLabel="Create new goal"
          />
        }
      />,
    );
    fireEvent.press(screen.getByLabelText("Create new goal"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not render anything in the right position when slot is omitted", () => {
    renderWithProviders(<ScreenHeader title="Settings" />);
    expect(screen.queryByLabelText("Create new goal")).toBeNull();
  });
});

describe("ScreenSubHeader", () => {
  it("renders the label with header role", () => {
    renderWithProviders(
      <ScreenSubHeader label="Focus Mode" onBack={() => {}} />,
    );
    const label = screen.getByText("Focus Mode");
    expect(label).toBeOnTheScreen();
    expect(label.props.accessibilityRole).toBe("header");
  });

  it("fires onBack when the back button is pressed", () => {
    const onBack = jest.fn();
    renderWithProviders(<ScreenSubHeader label="Focus Mode" onBack={onBack} />);
    fireEvent.press(screen.getByLabelText("Go back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("renders right slot when provided", () => {
    const onPress = jest.fn();
    renderWithProviders(
      <ScreenSubHeader
        label="Write a Note"
        onBack={() => {}}
        right={
          <IconButton
            icon={<RNText>S</RNText>}
            onPress={onPress}
            accessibilityLabel="Save note"
          />
        }
      />,
    );
    fireEvent.press(screen.getByLabelText("Save note"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("falls back to spacer when right slot is omitted", () => {
    renderWithProviders(<ScreenSubHeader label="Settings" onBack={() => {}} />);
    // Spacer fallback keeps the label centered against the back button.
    expect(screen.queryByLabelText("Save note")).toBeNull();
  });
});
