import React from "react";
import { ActivityIndicator } from "react-native";

import {
  act,
  fireEvent,
  renderWithProviders,
  screen,
} from "../../../__tests__/test-utils";
import { createDefaultBadgeDesign } from "../../../badges/types";
import { FinishBakingStage } from "../FinishBakingStage";

const badgeDesign = createDefaultBadgeDesign("Rewire the workshop");

describe("FinishBakingStage", () => {
  describe("busy (default) state", () => {
    it("renders the badge preview, spinner, and label", () => {
      renderWithProviders(<FinishBakingStage badgeDesign={badgeDesign} />);
      expect(screen.getByTestId("finish-baking-badge")).toBeOnTheScreen();
      expect(screen.getByText("Baking your badge…")).toBeOnTheScreen();
      // getByType throws if absent, so a truthy result confirms the spinner rendered.
      expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });

    it("announces the baking state via a polite live region", () => {
      renderWithProviders(<FinishBakingStage badgeDesign={badgeDesign} />);
      const region = screen.getByTestId("finish-baking-stage");
      expect(region.props.accessibilityLiveRegion).toBe("polite");
      expect(region.props.accessibilityLabel).toBe("Baking your badge…");
    });

    it("uses the provided label", () => {
      renderWithProviders(
        <FinishBakingStage badgeDesign={badgeDesign} label="Sealing it in…" />,
      );
      expect(screen.getByText("Sealing it in…")).toBeOnTheScreen();
    });

    // D8: all four in-flight phases render the identical busy interstitial.
    it.each(["building", "signing", "baking", "storing"] as const)(
      "renders the dimmed badge, spinner, and polite live region for the %s phase",
      (phase) => {
        renderWithProviders(
          <FinishBakingStage badgeDesign={badgeDesign} status={phase} />,
        );
        expect(screen.getByTestId("finish-baking-badge-dim")).toBeOnTheScreen();
        expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
        expect(
          screen.getByTestId("finish-baking-stage").props
            .accessibilityLiveRegion,
        ).toBe("polite");
      },
    );
  });

  describe("success state", () => {
    it("renders the badge at full opacity (no dim wrapper) with the success label and no spinner", () => {
      renderWithProviders(
        <FinishBakingStage badgeDesign={badgeDesign} status="success" />,
      );
      expect(screen.getByTestId("finish-baking-badge")).toBeOnTheScreen();
      expect(screen.queryByTestId("finish-baking-badge-dim")).toBeNull();
      expect(screen.getByText("Badge created!")).toBeOnTheScreen();
      expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
    });

    it("announces the success label via a polite live region", () => {
      renderWithProviders(
        <FinishBakingStage
          badgeDesign={badgeDesign}
          status="success"
          successLabel="All done!"
        />,
      );
      const region = screen.getByTestId("finish-baking-stage");
      expect(region.props.accessibilityLiveRegion).toBe("polite");
      expect(region.props.accessibilityLabel).toBe("All done!");
    });
  });

  describe("no-key state", () => {
    it("surfaces the no-key message as an alert", () => {
      renderWithProviders(
        <FinishBakingStage badgeDesign={badgeDesign} status="no-key" />,
      );
      const alert = screen.getByTestId("finish-baking-no-key-alert");
      expect(alert.props.accessibilityRole).toBe("alert");
      expect(alert.props.accessibilityLabel).toBe(
        "Badge signing key unavailable",
      );
      expect(
        screen.getByText("Badge signing key unavailable"),
      ).toBeOnTheScreen();
    });

    it("fires onExitWithoutBadge when the escape action is pressed", () => {
      const onExitWithoutBadge = jest.fn();
      renderWithProviders(
        <FinishBakingStage
          badgeDesign={badgeDesign}
          status="no-key"
          onExitWithoutBadge={onExitWithoutBadge}
        />,
      );
      fireEvent.press(screen.getByTestId("finish-baking-exit-button"));
      expect(onExitWithoutBadge).toHaveBeenCalledTimes(1);
    });

    it("renders no escape action when onExitWithoutBadge is omitted", () => {
      renderWithProviders(
        <FinishBakingStage badgeDesign={badgeDesign} status="no-key" />,
      );
      expect(screen.queryByTestId("finish-baking-exit-button")).toBeNull();
    });
  });

  describe("error state", () => {
    it("surfaces the caller-supplied error message as an alert", () => {
      renderWithProviders(
        <FinishBakingStage
          badgeDesign={badgeDesign}
          status="error"
          errorMessage="Something went wrong while baking."
        />,
      );
      const alert = screen.getByTestId("finish-baking-error-alert");
      expect(alert.props.accessibilityRole).toBe("alert");
      expect(alert.props.accessibilityLabel).toBe(
        "Something went wrong while baking.",
      );
      expect(
        screen.getByText("Something went wrong while baking."),
      ).toBeOnTheScreen();
    });

    it("falls back to a default message so the alert is never label-less", () => {
      renderWithProviders(
        <FinishBakingStage badgeDesign={badgeDesign} status="error" />,
      );
      const alert = screen.getByTestId("finish-baking-error-alert");
      expect(alert.props.accessibilityRole).toBe("alert");
      expect(typeof alert.props.accessibilityLabel).toBe("string");
      expect(alert.props.accessibilityLabel.length).toBeGreaterThan(0);
    });

    it("fires onRetry when Retry is pressed", () => {
      const onRetry = jest.fn();
      renderWithProviders(
        <FinishBakingStage
          badgeDesign={badgeDesign}
          status="error"
          errorMessage="Bake failed."
          onRetry={onRetry}
        />,
      );
      fireEvent.press(screen.getByTestId("finish-baking-retry-button"));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("renders no Retry button when onRetry is omitted", () => {
      renderWithProviders(
        <FinishBakingStage
          badgeDesign={badgeDesign}
          status="error"
          errorMessage="Bake failed."
        />,
      );
      expect(screen.queryByTestId("finish-baking-retry-button")).toBeNull();
    });

    it("marks the button busy/disabled after the first press (Button loading contract)", () => {
      const onRetry = jest.fn();
      renderWithProviders(
        <FinishBakingStage
          badgeDesign={badgeDesign}
          status="error"
          errorMessage="Bake failed."
          onRetry={onRetry}
        />,
      );
      const retry = screen.getByTestId("finish-baking-retry-button");
      fireEvent.press(retry);
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(retry.props.accessibilityState.busy).toBe(true);
      expect(retry.props.accessibilityState.disabled).toBe(true);
    });

    it("fires onRetry exactly once for two presses landing in the same frame (retryFiredRef guard)", () => {
      // Isolates the synchronous ref guard, not the Button's disabled state:
      // fireEvent.press flushes React between calls, so a second fireEvent.press
      // would be absorbed by the now-disabled Button and pass even if the ref
      // were removed. Reaching for the composite Pressable's onPress (which is
      // handleRetryPress) and invoking it twice inside one act() reproduces two
      // taps in a single frame — only retryFiredRef stops the duplicate dispatch.
      const onRetry = jest.fn();
      renderWithProviders(
        <FinishBakingStage
          badgeDesign={badgeDesign}
          status="error"
          errorMessage="Bake failed."
          onRetry={onRetry}
        />,
      );
      // getByTestId returns the host View; the onPress handler lives on the
      // composite Pressable above it, so walk up to the first ancestor carrying it.
      let node = screen.getByTestId("finish-baking-retry-button").parent;
      while (node && typeof node.props.onPress !== "function") {
        node = node.parent;
      }
      const onPress = node?.props.onPress as () => void;
      act(() => {
        onPress();
        onPress();
      });
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("re-arms Retry after the status leaves and re-enters error", () => {
      const onRetry = jest.fn();
      const { rerender } = renderWithProviders(
        <FinishBakingStage
          badgeDesign={badgeDesign}
          status="error"
          errorMessage="Bake failed."
          onRetry={onRetry}
        />,
      );
      fireEvent.press(screen.getByTestId("finish-baking-retry-button"));
      expect(onRetry).toHaveBeenCalledTimes(1);

      // Retry re-armed the bake → busy phase → fails again → back to error.
      rerender(
        <FinishBakingStage
          badgeDesign={badgeDesign}
          status="baking"
          onRetry={onRetry}
        />,
      );
      rerender(
        <FinishBakingStage
          badgeDesign={badgeDesign}
          status="error"
          errorMessage="Bake failed again."
          onRetry={onRetry}
        />,
      );

      const retry = screen.getByTestId("finish-baking-retry-button");
      expect(retry.props.accessibilityState.busy).toBe(false);
      fireEvent.press(retry);
      expect(onRetry).toHaveBeenCalledTimes(2);
    });
  });
});
