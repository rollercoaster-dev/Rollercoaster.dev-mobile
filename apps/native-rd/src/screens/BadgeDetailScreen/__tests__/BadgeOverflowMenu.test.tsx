import React from "react";
import { StyleSheet } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import {
  BadgeOverflowMenu,
  type BadgeOverflowMenuProps,
} from "../BadgeOverflowMenu";

const makeProps = (
  overrides?: Partial<BadgeOverflowMenuProps>,
): BadgeOverflowMenuProps => ({
  hasCredential: true,
  onShareBadge: jest.fn(),
  onExportCredential: jest.fn(),
  onDelete: jest.fn(),
  ...overrides,
});

describe("BadgeOverflowMenu", () => {
  it.each([
    { testID: "overflow-row-share", handler: "onShareBadge" as const },
    {
      testID: "overflow-row-credential",
      handler: "onExportCredential" as const,
    },
    { testID: "overflow-row-delete", handler: "onDelete" as const },
  ])(
    "fires $handler when the $testID row is pressed",
    ({ testID, handler }) => {
      const fn = jest.fn();
      renderWithProviders(
        <BadgeOverflowMenu {...makeProps({ [handler]: fn })} />,
      );
      fireEvent.press(screen.getByTestId(testID));
      expect(fn).toHaveBeenCalledTimes(1);
    },
  );

  it("disables the credential row when hasCredential is false", () => {
    const onExportCredential = jest.fn();
    renderWithProviders(
      <BadgeOverflowMenu
        {...makeProps({ hasCredential: false, onExportCredential })}
      />,
    );
    const credential = screen.getByTestId("overflow-row-credential");
    expect(credential.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(credential);
    expect(onExportCredential).not.toHaveBeenCalled();
  });

  it("keeps the Delete row enabled with a button role", () => {
    const onDelete = jest.fn();
    renderWithProviders(<BadgeOverflowMenu {...makeProps({ onDelete })} />);
    const del = screen.getByTestId("overflow-row-delete");
    expect(del.props.accessibilityRole).toBe("button");
    expect(del.props.accessibilityState?.disabled).toBeFalsy();
    fireEvent.press(del);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("gives every row a label and a >=44pt target", () => {
    renderWithProviders(<BadgeOverflowMenu {...makeProps()} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    buttons.forEach((button) => {
      expect(button.props.accessibilityLabel).toBeTruthy();
      const flat = StyleSheet.flatten(button.props.style) as {
        minHeight?: number;
      };
      expect(flat.minHeight).toBeGreaterThanOrEqual(44);
    });
  });
});
