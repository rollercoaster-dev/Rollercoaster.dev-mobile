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
import { i18n } from "../../../i18n";
import type { BadgeRendererHandle } from "../../../badges/BadgeRenderer";
import { getPathTextMaxChars } from "../../../badges/text/pathTextLimits";
import {
  createDefaultBadgeDesign,
  BadgeShape,
  BadgeCenterMode,
  BadgeFrame,
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
  it("renders the header, subtitle, preview, five sections, and bake CTA", () => {
    renderWithProviders(<FinishDesignStage {...makeProps()} />);
    expect(screen.getByText("Make your badge")).toBeOnTheScreen();
    expect(screen.getByText("Rewire the workshop")).toBeOnTheScreen();
    expect(screen.getByTestId("finish-design-preview")).toBeOnTheScreen();
    expect(screen.getByTestId("finish-design-shape")).toBeOnTheScreen();
    expect(screen.getByTestId("finish-design-frame")).toBeOnTheScreen();
    expect(screen.getByTestId("finish-design-center")).toBeOnTheScreen();
    expect(screen.getByTestId("finish-design-color")).toBeOnTheScreen();
    expect(screen.getByTestId("finish-design-inscriptions")).toBeOnTheScreen();
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
      <FinishDesignStage
        {...makeProps({ initialExpandedSection: "colors" })}
      />,
    );
    expect(screen.getByTestId("color-picker")).toBeOnTheScreen();
    expect(screen.queryByTestId("shape-selector")).toBeNull();
  });

  it("closes the open section when another is opened (single-open)", () => {
    renderWithProviders(
      <FinishDesignStage
        {...makeProps({ initialExpandedSection: "colors" })}
      />,
    );
    // Color is open, Shape is closed.
    expect(screen.getByTestId("color-picker")).toBeOnTheScreen();
    expect(screen.queryByTestId("shape-selector")).toBeNull();

    // Opening Shape must unmount Color's content.
    fireEvent.press(screen.getByLabelText("Shape, expand"));
    expect(screen.getByTestId("shape-selector")).toBeOnTheScreen();
    expect(screen.queryByTestId("color-picker")).toBeNull();
  });

  it("patches shape and leaves every non-path field byte-identical (D8)", () => {
    const onDesignChange = jest.fn();
    // No path text — isolates the pass-through guarantee from the arc re-clamp
    // asserted in the next test.
    const design = makeDesign({
      pathText: undefined,
      pathTextPosition: undefined,
    });
    renderWithProviders(
      <FinishDesignStage
        {...makeProps({
          design,
          onDesignChange,
          initialExpandedSection: "shape",
        })}
      />,
    );
    // Default design is `roundedRect`; target the Circle option by its a11y
    // label so the test doesn't depend on SHAPES ordering.
    fireEvent.press(screen.getByLabelText("Circle shape"));
    expect(onDesignChange).toHaveBeenCalledWith({
      ...design,
      shape: BadgeShape.circle,
      pathText: undefined,
      pathTextBottom: undefined,
    });
  });

  // Arc capacity is shape-dependent, so text that fits one shape can overrun
  // another. Mirrors BadgeDesignerScreen's own handleShapeChange — without it,
  // switching to a tighter shape silently renders text past its arc.
  it("re-clamps path text to the new shape's arc capacity", () => {
    const onDesignChange = jest.fn();
    const design = makeDesign({ pathText: "ACHIEVEMENT" });
    renderWithProviders(
      <FinishDesignStage
        {...makeProps({
          design,
          onDesignChange,
          initialExpandedSection: "shape",
        })}
      />,
    );
    fireEvent.press(screen.getByLabelText("Circle shape"));

    const patched = onDesignChange.mock.calls[0][0] as BadgeDesign;
    const max = getPathTextMaxChars(BadgeShape.circle, "top");
    expect(patched.pathText).toBe("ACHIEVEMENT".slice(0, max));
    expect(patched.pathText!.length).toBeLessThanOrEqual(max);
  });

  it("patches color through onDesignChange", () => {
    const onDesignChange = jest.fn();
    const design = makeDesign();
    renderWithProviders(
      <FinishDesignStage
        {...makeProps({
          design,
          onDesignChange,
          initialExpandedSection: "colors",
        })}
      />,
    );
    // No goalColor → swatches are exactly ACCENT_COLORS. Target the Mint
    // swatch by its a11y label so the test doesn't depend on palette ordering.
    const mint = ACCENT_COLORS.find((c) => c.id === "mint")!;
    fireEvent.press(screen.getByLabelText("Mint color"));
    expect(onDesignChange).toHaveBeenCalledWith({
      ...design,
      color: mint.hex,
    });
  });

  it("opens the custom-hex modal when the Custom… cell is tapped", () => {
    renderWithProviders(
      <FinishDesignStage
        {...makeProps({ initialExpandedSection: "colors" })}
      />,
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
          initialExpandedSection: "colors",
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
        {...makeProps({ onDesignChange, initialExpandedSection: "colors" })}
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
    // Default design is monogram; target the Icon option by its a11y label so
    // the test doesn't depend on MODES ordering.
    fireEvent.press(screen.getByLabelText("Icon center"));
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
          initialExpandedSection: "inscriptions",
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

  // Parity with BadgeDesignerScreen's editor. The finishing flow is now the
  // only way to design a badge before it is baked, so a channel missing here
  // is a channel the user can never reach at bake time (#449).
  describe("full-designer parity", () => {
    it("exposes the border, frame and icon color channels, not just fill", () => {
      renderWithProviders(
        <FinishDesignStage
          {...makeProps({
            design: makeDesign({ frame: BadgeFrame.guilloche }),
            initialExpandedSection: "colors",
          })}
        />,
      );
      expect(
        screen.getByLabelText(i18n.t("badgeDesigner:colorChannels.fill")),
      ).toBeOnTheScreen();
      expect(
        screen.getByLabelText(i18n.t("badgeDesigner:colorChannels.border")),
      ).toBeOnTheScreen();
      expect(
        screen.getByLabelText(i18n.t("badgeDesigner:colorChannels.frame")),
      ).toBeOnTheScreen();
      expect(
        screen.getByLabelText(i18n.t("badgeDesigner:colorChannels.icon")),
      ).toBeOnTheScreen();
    });

    it("patches borderColor from the Border channel", () => {
      const onDesignChange = jest.fn();
      const design = makeDesign();
      renderWithProviders(
        <FinishDesignStage
          {...makeProps({
            design,
            onDesignChange,
            initialExpandedSection: "colors",
          })}
        />,
      );
      fireEvent.press(
        screen.getByLabelText(i18n.t("badgeDesigner:colorChannels.border")),
      );
      const mint = ACCENT_COLORS.find((c) => c.id === "mint")!;
      fireEvent.press(
        screen.getByLabelText(
          i18n.t("badgeDesigner:borderColor.optionA11y", {
            label: i18n.t("badgeDesigner:borderColor.options.mint"),
          }),
        ),
      );
      expect(onDesignChange).toHaveBeenCalledWith({
        ...design,
        borderColor: mint.hex,
      });
    });

    it("drops borderColor entirely when the match-theme sentinel is chosen", () => {
      const onDesignChange = jest.fn();
      const design = makeDesign({ borderColor: "#123456" });
      renderWithProviders(
        <FinishDesignStage
          {...makeProps({
            design,
            onDesignChange,
            initialExpandedSection: "colors",
          })}
        />,
      );
      fireEvent.press(
        screen.getByLabelText(i18n.t("badgeDesigner:colorChannels.border")),
      );
      fireEvent.press(
        screen.getByText(i18n.t("badgeDesigner:borderColor.matchTheme")),
      );
      const patched = onDesignChange.mock.calls[0][0] as BadgeDesign;
      expect(patched).not.toHaveProperty("borderColor");
    });

    it("patches the frame and applies the caller's frameParams", () => {
      const onDesignChange = jest.fn();
      const design = makeDesign();
      const frameParams = {
        variant: 1,
        stepCount: 5,
        evidenceCount: 3,
        daysToComplete: 21,
        evidenceTypes: 2,
      };
      renderWithProviders(
        <FinishDesignStage
          {...makeProps({
            design,
            onDesignChange,
            frameParams,
            initialExpandedSection: "frame",
          })}
        />,
      );
      fireEvent.press(
        screen.getByLabelText(
          i18n.t("badgeDesigner:frame.optionA11y", {
            label: i18n.t("badgeDesigner:frame.options.guilloche"),
          }),
        ),
      );
      expect(onDesignChange).toHaveBeenCalledWith({
        ...design,
        frame: BadgeFrame.guilloche,
        frameParams,
      });
    });

    it("clears frame and frameColor together when the frame is removed", () => {
      const onDesignChange = jest.fn();
      const design = makeDesign({
        frame: BadgeFrame.guilloche,
        frameColor: "#123456",
      });
      renderWithProviders(
        <FinishDesignStage
          {...makeProps({
            design,
            onDesignChange,
            initialExpandedSection: "frame",
          })}
        />,
      );
      fireEvent.press(
        screen.getByLabelText(
          i18n.t("badgeDesigner:frame.optionA11y", {
            label: i18n.t("badgeDesigner:frame.options.none"),
          }),
        ),
      );
      const patched = onDesignChange.mock.calls[0][0] as BadgeDesign;
      expect(patched.frame).toBe(BadgeFrame.none);
      expect(patched.frameParams).toBeUndefined();
      expect(patched).not.toHaveProperty("frameColor");
    });

    it("exposes the path-text and banner editors alongside the bottom label", () => {
      renderWithProviders(
        <FinishDesignStage
          {...makeProps({ initialExpandedSection: "inscriptions" })}
        />,
      );
      expect(
        screen.getByTestId("finish-design-bottom-label-input"),
      ).toBeOnTheScreen();
      expect(screen.getByTestId("path-text-editor")).toBeOnTheScreen();
      expect(screen.getByTestId("banner-editor")).toBeOnTheScreen();
    });
  });

  // #449 D3: the screen rasterizes the *visible* preview on Bake, so the ref
  // must reach the mounted BadgeRenderer's imperative handle — not a detached
  // or never-attached ref that would make captureBadge throw at bake time.
  it("forwards previewRef to the mounted BadgeRenderer handle", () => {
    const previewRef = React.createRef<BadgeRendererHandle>();
    renderWithProviders(<FinishDesignStage {...makeProps({ previewRef })} />);

    expect(screen.getByTestId("finish-design-preview")).toBeOnTheScreen();
    expect(previewRef.current).not.toBeNull();
    expect(typeof previewRef.current?.captureAsPng).toBe("function");
  });
});
