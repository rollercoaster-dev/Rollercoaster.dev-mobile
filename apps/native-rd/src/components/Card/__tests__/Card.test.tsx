import React from "react";
import { Text } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { Card } from "../Card";

describe("Card", () => {
  it("renders children in a static container", () => {
    renderWithProviders(
      <Card>
        <Text>Card content</Text>
      </Card>,
    );
    expect(screen.getByText("Card content")).toBeOnTheScreen();
  });

  it("calls onPress when pressable", () => {
    const onPress = jest.fn();
    renderWithProviders(
      <Card onPress={onPress} accessibilityLabel="Test card">
        <Text>Pressable</Text>
      </Card>,
    );
    fireEvent.press(screen.getByText("Pressable"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("calls onLongPress when provided", () => {
    const onLongPress = jest.fn();
    renderWithProviders(
      <Card onLongPress={onLongPress} accessibilityLabel="Long press card">
        <Text>Long press</Text>
      </Card>,
    );
    fireEvent(screen.getByText("Long press"), "onLongPress");
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });
});
