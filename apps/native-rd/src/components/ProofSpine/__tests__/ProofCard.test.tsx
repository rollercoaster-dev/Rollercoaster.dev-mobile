import React from "react";
import { StyleSheet } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import type { EvidenceTypeValue } from "../../../types/evidence";
import { ProofCard } from "../ProofCard";

const ALL_TYPES: EvidenceTypeValue[] = [
  "photo",
  "video",
  "text",
  "voice_memo",
  "link",
  "file",
];

const defaultProps = {
  id: "ev-1",
  name: "Lab notebook page",
  type: "photo" as EvidenceTypeValue | null,
  onCardPress: jest.fn(),
};

describe("ProofCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the evidence name", () => {
    renderWithProviders(<ProofCard {...defaultProps} />);
    expect(screen.getByText("Lab notebook page")).toBeOnTheScreen();
  });

  it.each(ALL_TYPES)("renders the translated type tag for type %s", (type) => {
    renderWithProviders(<ProofCard {...defaultProps} type={type} />);
    const label = i18n.t(`common:evidenceTypes.${type}.label`);
    expect(screen.getByText(label)).toBeOnTheScreen();
  });

  it("renders no type tag when type is null", () => {
    renderWithProviders(<ProofCard {...defaultProps} type={null} />);
    // None of the type labels appear as a tag for untyped evidence.
    for (const type of ALL_TYPES) {
      expect(
        screen.queryByText(i18n.t(`common:evidenceTypes.${type}.label`)),
      ).toBeNull();
    }
  });

  it("calls onCardPress with the id exactly once on press", () => {
    const onCardPress = jest.fn();
    renderWithProviders(
      <ProofCard {...defaultProps} onCardPress={onCardPress} />,
    );
    fireEvent.press(screen.getByRole("button"));
    expect(onCardPress).toHaveBeenCalledTimes(1);
    expect(onCardPress).toHaveBeenCalledWith("ev-1");
  });

  it("exposes accessibilityRole=button", () => {
    renderWithProviders(<ProofCard {...defaultProps} />);
    expect(screen.getByRole("button")).toBeOnTheScreen();
  });

  it("composes an accessibility label from name and translated type", () => {
    renderWithProviders(<ProofCard {...defaultProps} type="photo" />);
    const expected = i18n.t("badgeDetail:evidenceList.itemA11y", {
      name: "Lab notebook page",
      type: i18n.t("common:evidenceTypes.photo.label"),
    });
    expect(screen.getByLabelText(expected)).toBeOnTheScreen();
  });

  it("uses the fallback type word in the a11y label when type is null", () => {
    renderWithProviders(<ProofCard {...defaultProps} type={null} />);
    const expected = i18n.t("badgeDetail:evidenceList.itemA11y", {
      name: "Lab notebook page",
      type: i18n.t("badgeDetail:evidenceList.fallbackType"),
    });
    expect(screen.getByLabelText(expected)).toBeOnTheScreen();
  });

  it("enforces a 44x44pt minimum touch target", () => {
    renderWithProviders(<ProofCard {...defaultProps} />);
    const style = StyleSheet.flatten(
      screen.getByRole("button").props.style,
    ) as { minWidth?: number; minHeight?: number };
    expect(style.minWidth).toBeGreaterThanOrEqual(44);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  });
});
