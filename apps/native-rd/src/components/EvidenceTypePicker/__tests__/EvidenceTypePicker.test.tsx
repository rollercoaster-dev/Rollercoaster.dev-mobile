import React from "react";
import { BackHandler, AccessibilityInfo, type View } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
  act,
} from "../../../__tests__/test-utils";
import { EvidenceTypePicker } from "../EvidenceTypePicker";
import { EvidenceType } from "../../../db";
import { EVIDENCE_OPTIONS } from "../../../types/evidence";
import type { EvidenceTypeValue } from "../../../types/evidence";
import { i18n } from "../../../i18n";
import { evidenceLabel } from "../../../i18n/labels";

// findNodeHandle is a lazy getter on react-native's index — redefine it so the
// capture sheet's restoreFocusRef resolves to a fixed tag under test (#501).
jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  Object.defineProperty(RN, "findNodeHandle", {
    configurable: true,
    value: jest.fn(() => 111),
  });
  return RN;
});

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

  describe("capture mode", () => {
    const captureProps = {
      mode: "capture" as const,
      visible: true,
      onSelectType: jest.fn(),
      onClose: jest.fn(),
    };

    const closeLabel = i18n.t("common:actions.close");

    it("renders all six evidence options with labels and icons", () => {
      renderWithProviders(<EvidenceTypePicker {...captureProps} />);

      for (const opt of EVIDENCE_OPTIONS) {
        expect(screen.getByText(labelFor(opt.type))).toBeOnTheScreen();
        expect(screen.getByText(opt.icon)).toBeOnTheScreen();
      }
    });

    it("defaults the header to 'Add evidence' when no headerTitle is given", () => {
      renderWithProviders(<EvidenceTypePicker {...captureProps} />);

      expect(
        screen.getByText(i18n.t("common:evidenceTypePicker.addEvidence")),
      ).toBeOnTheScreen();
    });

    it("renders a provided headerTitle in place of the default (#463 D3)", () => {
      renderWithProviders(
        <EvidenceTypePicker {...captureProps} headerTitle="Evidence type" />,
      );

      expect(screen.getByText("Evidence type")).toBeOnTheScreen();
      expect(
        screen.queryByText(i18n.t("common:evidenceTypePicker.addEvidence")),
      ).toBeNull();
    });

    it("highlights Note (text) by default when no selectedType is given (D5)", () => {
      renderWithProviders(<EvidenceTypePicker {...captureProps} />);

      const noteCell = screen.getByLabelText(labelFor(EvidenceType.text));
      expect(noteCell.props.accessibilityState).toEqual({ checked: true });

      const photoCell = screen.getByLabelText(labelFor(EvidenceType.photo));
      expect(photoCell.props.accessibilityState).toEqual({ checked: false });
    });

    it("highlights the provided selectedType — the change re-open case (D6)", () => {
      renderWithProviders(
        <EvidenceTypePicker
          {...captureProps}
          selectedType={EvidenceType.photo as EvidenceTypeValue}
        />,
      );

      const photoCell = screen.getByLabelText(labelFor(EvidenceType.photo));
      expect(photoCell.props.accessibilityState).toEqual({ checked: true });

      const noteCell = screen.getByLabelText(labelFor(EvidenceType.text));
      expect(noteCell.props.accessibilityState).toEqual({ checked: false });
    });

    it("gives each cell a radio accessibilityRole", () => {
      renderWithProviders(<EvidenceTypePicker {...captureProps} />);

      for (const opt of EVIDENCE_OPTIONS) {
        const cell = screen.getByLabelText(labelFor(opt.type));
        expect(cell.props.accessibilityRole).toBe("radio");
      }
    });

    it.each(EVIDENCE_OPTIONS.map((opt) => opt.type))(
      "calls onSelectType with %s when its cell is pressed",
      (type) => {
        const onSelectType = jest.fn();
        renderWithProviders(
          <EvidenceTypePicker {...captureProps} onSelectType={onSelectType} />,
        );

        fireEvent.press(screen.getByLabelText(labelFor(type)));
        expect(onSelectType).toHaveBeenCalledWith(type);
      },
    );

    it("renders the sub-line with the interpolated active step title", () => {
      renderWithProviders(
        <EvidenceTypePicker
          {...captureProps}
          activeStepTitle="Wire the relay panel"
        />,
      );

      expect(
        screen.getByText(
          i18n.t("common:evidenceTypePicker.savingToActiveStep", {
            title: "Wire the relay panel",
          }),
        ),
      ).toBeOnTheScreen();
    });

    it("omits the sub-line when no active step title is given", () => {
      renderWithProviders(<EvidenceTypePicker {...captureProps} />);

      expect(screen.queryByText(/Saving to your active step/)).toBeNull();
    });

    it("calls onClose when the header close button is pressed", () => {
      const onClose = jest.fn();
      renderWithProviders(
        <EvidenceTypePicker {...captureProps} onClose={onClose} />,
      );

      // The header × bubbles its press to the labelled close Pressable.
      fireEvent.press(screen.getByText("✕"));
      expect(onClose).toHaveBeenCalled();
    });

    it("calls onClose when the backdrop is pressed", () => {
      const onClose = jest.fn();
      renderWithProviders(
        <EvidenceTypePicker {...captureProps} onClose={onClose} />,
      );

      // Target the backdrop by testID rather than by position among the
      // shared-"Close"-label controls, so a z-order refactor can't silently
      // repoint this assertion at the header ✕ instead.
      const backdrop = screen.getByTestId("capture-sheet-backdrop");
      expect(backdrop.props.accessibilityLabel).toBe(closeLabel);
      fireEvent.press(backdrop);
      expect(onClose).toHaveBeenCalled();
    });

    it("calls onClose on Android hardware back while open", () => {
      const onClose = jest.fn();
      const addSpy = jest.spyOn(BackHandler, "addEventListener");
      renderWithProviders(
        <EvidenceTypePicker {...captureProps} onClose={onClose} />,
      );

      // The sole dismissal route for Android hardware/gesture back — distinct
      // from the backdrop and header-✕ Pressables. The in-tree sheet registers
      // its own BackHandler listener (the RN Modal used to own this).
      const handler = addSpy.mock.calls.find(
        ([event]) => event === "hardwareBackPress",
      )?.[1];
      expect(handler).toBeDefined();
      // Returning true claims the event so the host screen doesn't also pop.
      expect(handler?.()).toBe(true);
      expect(onClose).toHaveBeenCalled();
    });

    it("renders nothing when visible is false", () => {
      renderWithProviders(
        <EvidenceTypePicker {...captureProps} visible={false} />,
      );

      expect(screen.queryByText("✕")).toBeNull();
      expect(screen.queryByText(labelFor(EvidenceType.text))).toBeNull();
    });

    it("forwards restoreFocusRef so focus returns to the trigger on close (#501)", () => {
      jest.useFakeTimers();
      const setFocus = jest
        .spyOn(AccessibilityInfo, "setAccessibilityFocus")
        .mockImplementation(() => undefined);
      // A stand-in trigger ref; the mocked findNodeHandle resolves it to 111.
      const restoreFocusRef = {
        current: {},
      } as unknown as React.RefObject<View>;

      const { rerender } = renderWithProviders(
        <EvidenceTypePicker
          {...captureProps}
          visible
          restoreFocusRef={restoreFocusRef}
        />,
      );
      act(() => {
        jest.runAllTimers();
      });
      // Isolate the close-restore from the open (title) focus.
      setFocus.mockClear();
      rerender(
        <EvidenceTypePicker
          {...captureProps}
          visible={false}
          restoreFocusRef={restoreFocusRef}
        />,
      );
      act(() => {
        jest.runAllTimers();
      });
      expect(setFocus).toHaveBeenCalledWith(111);

      jest.useRealTimers();
      setFocus.mockRestore();
    });
  });
});
