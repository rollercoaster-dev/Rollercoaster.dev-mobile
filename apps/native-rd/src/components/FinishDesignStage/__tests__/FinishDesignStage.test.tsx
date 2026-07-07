import React from "react";

import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import {
  FinishDesignStage,
  type FinishDesignStageProps,
} from "../FinishDesignStage";
import { ACCENT_COLORS } from "../../../badges/ColorPicker";
import {
  createDefaultBadgeDesign,
  BadgeShape,
  BadgeCenterMode,
  BannerPosition,
  PathTextPosition,
  BADGE_COLOR_THEME_SENTINEL,
  type BadgeDesign,
} from "../../../badges/types";

// ColorPickerModal stub: rendering the real reanimated-color-picker is out of
// scope for a unit test. This exposes the Confirm and Close paths as Pressables
// so we can drive them deterministically, mirroring BadgeDesignerScreen's stub.
jest.mock("../../../badges/ColorPickerModal", () => {
  const React = require("react");
  const { Pressable, View } = require("react-native");
  return {
    ColorPickerModal: ({
      visible,
      initialColor,
      onConfirm,
      onClose,
    }: {
      visible: boolean;
      initialColor: string;
      onConfirm: (hex: string) => void;
      onClose: () => void;
    }) => {
      if (!visible) return null;
      return (
        <View
          testID="mock-color-picker-modal"
          accessibilityLabel={initialColor}
        >
          <Pressable
            testID="mock-color-picker-modal-confirm"
            onPress={() => onConfirm("#deadbe")}
          />
          <Pressable testID="mock-color-picker-modal-close" onPress={onClose} />
        </View>
      );
    },
  };
});

// A design carrying the pass-through fields this component must NOT touch
// (frame, pathText, banner, frameColor, iconColor), so the D8 regression can
// assert they survive a change byte-identical.
const makeDesign = (overrides?: Partial<BadgeDesign>): BadgeDesign => ({
  ...createDefaultBadgeDesign("Rewire the workshop", null),
  pathText: "ACHIEVEMENT",
  pathTextPosition: PathTextPosition.top,
  banner: { text: "WIN", position: BannerPosition.top },
  frameColor: BADGE_COLOR_THEME_SENTINEL,
  iconColor: BADGE_COLOR_THEME_SENTINEL,
  ...overrides,
});

const makeProps = (
  overrides?: Partial<FinishDesignStageProps>,
): FinishDesignStageProps => ({
  design: makeDesign(),
  onDesignChange: jest.fn(),
  goalTitle: "Rewire the workshop",
  onBack: jest.fn(),
  onBake: jest.fn(),
  ...overrides,
});

describe("FinishDesignStage", () => {
  it("renders the header, subtitle, preview, four sections, and bake CTA", () => {
    renderWithProviders(<FinishDesignStage {...makeProps()} />);
    expect(screen.getByText("Make your badge")).toBeOnTheScreen();
    expect(screen.getByText("Rewire the workshop")).toBeOnTheScreen();
    expect(screen.getByTestId("finish-design-preview")).toBeOnTheScreen();
    expect(screen.getByTestId("finish-design-shape")).toBeOnTheScreen();
    expect(screen.getByTestId("finish-design-color")).toBeOnTheScreen();
    expect(screen.getByTestId("finish-design-center")).toBeOnTheScreen();
    expect(screen.getByTestId("finish-design-bottom-label")).toBeOnTheScreen();
    expect(screen.getByTestId("finish-design-bake")).toBeOnTheScreen();
  });

  it("gives the header title a header a11y role", () => {
    renderWithProviders(<FinishDesignStage {...makeProps()} />);
    expect(screen.getByText("Make your badge").props.accessibilityRole).toBe(
      "header",
    );
  });

  it("omits the subtitle when no goalTitle is passed", () => {
    renderWithProviders(
      <FinishDesignStage {...makeProps({ goalTitle: undefined })} />,
    );
    expect(screen.queryByText("Rewire the workshop")).toBeNull();
  });

  it("opens only the seeded section (single-open, others unmounted)", () => {
    renderWithProviders(
      <FinishDesignStage {...makeProps({ initialExpandedSection: "color" })} />,
    );
    expect(screen.getByTestId("color-picker")).toBeOnTheScreen();
    expect(screen.queryByTestId("shape-selector")).toBeNull();
  });

  it("closes the open section when another is opened (single-open)", () => {
    renderWithProviders(
      <FinishDesignStage {...makeProps({ initialExpandedSection: "color" })} />,
    );
    // Color is open, Shape is closed.
    expect(screen.getByTestId("color-picker")).toBeOnTheScreen();
    expect(screen.queryByTestId("shape-selector")).toBeNull();

    // Opening Shape must unmount Color's content.
    fireEvent.press(screen.getByLabelText("Shape, expand"));
    expect(screen.getByTestId("shape-selector")).toBeOnTheScreen();
    expect(screen.queryByTestId("color-picker")).toBeNull();
  });

  it("patches shape and leaves every other field byte-identical (D8)", () => {
    const onDesignChange = jest.fn();
    const design = makeDesign();
    renderWithProviders(
      <FinishDesignStage
        {...makeProps({
          design,
          onDesignChange,
          initialExpandedSection: "shape",
        })}
      />,
    );
    // SHAPES order starts with `circle`; the default design is `roundedRect`.
    fireEvent.press(screen.getAllByRole("radio")[0]);
    expect(onDesignChange).toHaveBeenCalledWith({
      ...design,
      shape: BadgeShape.circle,
    });
  });

  it("patches color through onDesignChange", () => {
    const onDesignChange = jest.fn();
    const design = makeDesign();
    renderWithProviders(
      <FinishDesignStage
        {...makeProps({
          design,
          onDesignChange,
          initialExpandedSection: "color",
        })}
      />,
    );
    // No goalColor → swatches are exactly ACCENT_COLORS; index 1 is a color
    // other than the default fill.
    fireEvent.press(screen.getAllByRole("radio")[1]);
    expect(onDesignChange).toHaveBeenCalledWith({
      ...design,
      color: ACCENT_COLORS[1].hex,
    });
  });

  it("opens the custom-hex modal when the Custom… cell is tapped", () => {
    renderWithProviders(
      <FinishDesignStage {...makeProps({ initialExpandedSection: "color" })} />,
    );
    // Modal is closed until the trailing custom cell is pressed.
    expect(screen.queryByTestId("mock-color-picker-modal")).toBeNull();
    fireEvent.press(screen.getByTestId("color-picker-custom"));
    expect(screen.getByTestId("mock-color-picker-modal")).toBeOnTheScreen();
  });

  it("confirming a custom hex patches only color, byte-identical otherwise (D8)", () => {
    const onDesignChange = jest.fn();
    const design = makeDesign();
    renderWithProviders(
      <FinishDesignStage
        {...makeProps({
          design,
          onDesignChange,
          initialExpandedSection: "color",
        })}
      />,
    );
    fireEvent.press(screen.getByTestId("color-picker-custom"));
    fireEvent.press(screen.getByTestId("mock-color-picker-modal-confirm"));
    expect(onDesignChange).toHaveBeenCalledWith({
      ...design,
      color: "#deadbe",
    });
    // Modal closes on confirm.
    expect(screen.queryByTestId("mock-color-picker-modal")).toBeNull();
  });

  it("closing the custom-hex modal leaves the design untouched", () => {
    const onDesignChange = jest.fn();
    renderWithProviders(
      <FinishDesignStage
        {...makeProps({ onDesignChange, initialExpandedSection: "color" })}
      />,
    );
    fireEvent.press(screen.getByTestId("color-picker-custom"));
    fireEvent.press(screen.getByTestId("mock-color-picker-modal-close"));
    expect(onDesignChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId("mock-color-picker-modal")).toBeNull();
  });

  it("patches center mode through onDesignChange", () => {
    const onDesignChange = jest.fn();
    const design = makeDesign();
    renderWithProviders(
      <FinishDesignStage
        {...makeProps({
          design,
          onDesignChange,
          initialExpandedSection: "center",
        })}
      />,
    );
    // MODES order is [icon, monogram]; the default design is monogram.
    fireEvent.press(screen.getAllByRole("radio")[0]);
    expect(onDesignChange).toHaveBeenCalledWith({
      ...design,
      centerMode: BadgeCenterMode.icon,
    });
  });

  it("patches the monogram and leaves every other field byte-identical (D8)", () => {
    const onDesignChange = jest.fn();
    // Default center mode is monogram, so the monogram input is mounted with
    // the center section open — no mode switch needed.
    const design = makeDesign();
    renderWithProviders(
      <FinishDesignStage
        {...makeProps({
          design,
          onDesignChange,
          initialExpandedSection: "center",
        })}
      />,
    );
    fireEvent.changeText(screen.getByLabelText("Monogram text"), "RW");
    expect(onDesignChange).toHaveBeenCalledWith({
      ...design,
      monogram: "RW",
    });
  });

  it("patches the bottom label through onDesignChange", () => {
    const onDesignChange = jest.fn();
    const design = makeDesign();
    renderWithProviders(
      <FinishDesignStage
        {...makeProps({
          design,
          onDesignChange,
          initialExpandedSection: "bottomLabel",
        })}
      />,
    );
    fireEvent.changeText(
      screen.getByTestId("finish-design-bottom-label-input"),
      "DONE",
    );
    expect(onDesignChange).toHaveBeenCalledWith({
      ...design,
      bottomLabel: "DONE",
    });
  });

  it("shows the IconPicker only when the center mode is icon", () => {
    const { rerender } = renderWithProviders(
      <FinishDesignStage
        {...makeProps({ initialExpandedSection: "center" })}
      />,
    );
    // Default center mode is monogram — no IconPicker.
    expect(screen.queryByTestId("icon-picker")).toBeNull();

    rerender(
      <FinishDesignStage
        {...makeProps({
          design: makeDesign({ centerMode: BadgeCenterMode.icon }),
          initialExpandedSection: "center",
        })}
      />,
    );
    expect(screen.getByTestId("icon-picker")).toBeOnTheScreen();
  });

  it("fires onBack when the back button is pressed", () => {
    const onBack = jest.fn();
    renderWithProviders(<FinishDesignStage {...makeProps({ onBack })} />);
    fireEvent.press(screen.getByTestId("finish-design-back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("fires onBake when the CTA is pressed", () => {
    const onBake = jest.fn();
    renderWithProviders(<FinishDesignStage {...makeProps({ onBake })} />);
    fireEvent.press(screen.getByTestId("finish-design-bake"));
    expect(onBake).toHaveBeenCalledTimes(1);
  });
});
