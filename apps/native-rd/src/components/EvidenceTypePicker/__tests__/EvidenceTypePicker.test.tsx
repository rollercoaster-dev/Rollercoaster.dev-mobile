import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { EvidenceTypePicker } from "../EvidenceTypePicker";
import { EvidenceType } from "../../../db";
import { EVIDENCE_OPTIONS } from "../../../types/evidence";
import type { EvidenceTypeValue } from "../../../types/evidence";

describe("EvidenceTypePicker", () => {
  const defaultProps = {
    selectedTypes: [EvidenceType.text as EvidenceTypeValue],
    onToggleType: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("full mode", () => {
    it("renders all evidence type options", () => {
      renderWithProviders(<EvidenceTypePicker {...defaultProps} />);

      for (const opt of EVIDENCE_OPTIONS) {
        expect(screen.getByText(opt.label)).toBeOnTheScreen();
      }
    });

    it("renders label when provided", () => {
      renderWithProviders(
        <EvidenceTypePicker {...defaultProps} label="Evidence types" />,
      );
      expect(screen.getByText("Evidence types")).toBeOnTheScreen();
    });

    it("does not render label when not provided", () => {
      renderWithProviders(<EvidenceTypePicker {...defaultProps} />);
      expect(screen.queryByText("Evidence types")).toBeNull();
    });

    it("calls onToggleType when chip is pressed", () => {
      const onToggle = jest.fn();
      renderWithProviders(
        <EvidenceTypePicker {...defaultProps} onToggleType={onToggle} />,
      );

      fireEvent.press(screen.getByLabelText("Take Photo"));
      expect(onToggle).toHaveBeenCalledWith(EvidenceType.photo);
    });

    it("marks selected types with checked state", () => {
      renderWithProviders(
        <EvidenceTypePicker
          selectedTypes={[
            EvidenceType.text as EvidenceTypeValue,
            EvidenceType.photo as EvidenceTypeValue,
          ]}
          onToggleType={jest.fn()}
        />,
      );

      const textChip = screen.getByLabelText("Write a Note");
      expect(textChip.props.accessibilityState).toEqual({ checked: true });

      const photoChip = screen.getByLabelText("Take Photo");
      expect(photoChip.props.accessibilityState).toEqual({ checked: true });

      const videoChip = screen.getByLabelText("Record Video");
      expect(videoChip.props.accessibilityState).toEqual({ checked: false });
    });

    it("has checkbox accessibilityRole on each chip", () => {
      renderWithProviders(<EvidenceTypePicker {...defaultProps} />);

      for (const opt of EVIDENCE_OPTIONS) {
        const chip = screen.getByLabelText(opt.label);
        expect(chip.props.accessibilityRole).toBe("checkbox");
      }
    });

    it.each([
      [
        "selected",
        [EvidenceType.photo as EvidenceTypeValue],
        "Take Photo",
        "Deselect Take Photo",
      ],
      ["unselected", [], "Take Photo", "Select Take Photo"],
    ])(
      "shows correct hint for %s chip",
      (_label, types, chipLabel, expectedHint) => {
        renderWithProviders(
          <EvidenceTypePicker selectedTypes={types} onToggleType={jest.fn()} />,
        );
        const chip = screen.getByLabelText(chipLabel);
        expect(chip.props.accessibilityHint).toBe(expectedHint);
      },
    );
  });

  describe("compact mode", () => {
    it("renders only selected types", () => {
      renderWithProviders(
        <EvidenceTypePicker
          selectedTypes={[
            EvidenceType.photo as EvidenceTypeValue,
            EvidenceType.voice_memo as EvidenceTypeValue,
          ]}
          onToggleType={jest.fn()}
          compact
        />,
      );

      expect(screen.getByText("Take Photo")).toBeOnTheScreen();
      expect(screen.getByText("Record Voice Memo")).toBeOnTheScreen();
      expect(screen.queryByText("Write a Note")).toBeNull();
      expect(screen.queryByText("Record Video")).toBeNull();
    });

    it("renders nothing when no types selected", () => {
      renderWithProviders(
        <EvidenceTypePicker
          selectedTypes={[]}
          onToggleType={jest.fn()}
          compact
        />,
      );

      for (const opt of EVIDENCE_OPTIONS) {
        expect(screen.queryByText(opt.label)).toBeNull();
      }
    });
  });
});
