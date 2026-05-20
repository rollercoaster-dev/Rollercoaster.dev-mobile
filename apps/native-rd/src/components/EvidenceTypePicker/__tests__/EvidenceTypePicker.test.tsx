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
import { i18n } from "../../../i18n";
import { evidenceLabel } from "../../../i18n/labels";

const labelFor = (type: EvidenceTypeValue) =>
  evidenceLabel(i18n.t.bind(i18n), type);

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
        expect(screen.getByText(labelFor(opt.type))).toBeOnTheScreen();
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

      fireEvent.press(screen.getByLabelText(labelFor(EvidenceType.photo)));
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

      const textChip = screen.getByLabelText(labelFor(EvidenceType.text));
      expect(textChip.props.accessibilityState).toEqual({ checked: true });

      const photoChip = screen.getByLabelText(labelFor(EvidenceType.photo));
      expect(photoChip.props.accessibilityState).toEqual({ checked: true });

      const videoChip = screen.getByLabelText(labelFor(EvidenceType.video));
      expect(videoChip.props.accessibilityState).toEqual({ checked: false });
    });

    it("has checkbox accessibilityRole on each chip", () => {
      renderWithProviders(<EvidenceTypePicker {...defaultProps} />);

      for (const opt of EVIDENCE_OPTIONS) {
        const chip = screen.getByLabelText(labelFor(opt.type));
        expect(chip.props.accessibilityRole).toBe("checkbox");
      }
    });

    it.each([
      [
        "selected",
        [EvidenceType.photo as EvidenceTypeValue],
        EvidenceType.photo as EvidenceTypeValue,
        (label: string) => `Deselect ${label}`,
      ],
      [
        "unselected",
        [],
        EvidenceType.photo as EvidenceTypeValue,
        (label: string) => `Select ${label}`,
      ],
    ])(
      "shows correct hint for %s chip",
      (_label, types, chipType, expectedHint) => {
        renderWithProviders(
          <EvidenceTypePicker selectedTypes={types} onToggleType={jest.fn()} />,
        );
        const label = labelFor(chipType);
        const chip = screen.getByLabelText(label);
        expect(chip.props.accessibilityHint).toBe(expectedHint(label));
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

      expect(screen.getByText(labelFor(EvidenceType.photo))).toBeOnTheScreen();
      expect(
        screen.getByText(labelFor(EvidenceType.voice_memo)),
      ).toBeOnTheScreen();
      expect(screen.queryByText(labelFor(EvidenceType.text))).toBeNull();
      expect(screen.queryByText(labelFor(EvidenceType.video))).toBeNull();
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
        expect(screen.queryByText(labelFor(opt.type))).toBeNull();
      }
    });
  });
});
