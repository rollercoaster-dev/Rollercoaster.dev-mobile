import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useUnistyles } from "react-native-unistyles";

import { BadgeRenderer } from "../../badges/BadgeRenderer";
import { type BadgeDesign } from "../../badges/types";
import { Button } from "../Button";
import { Text } from "../Text";
import { styles } from "./FinishBakingStage.styles";

const DEFAULT_BADGE_SIZE = 146;
const DEFAULT_ERROR_MESSAGE = "We couldn't finish baking your badge.";

/**
 * The four in-flight bake phases — the busy subset of `useCreateBadge`'s
 * `BadgeCreationStatus`. All four render identically (D8) — no per-phase copy.
 */
export type FinishBakingPhase = "building" | "signing" | "baking" | "storing";

/**
 * Full render-state union for the baking interstitial: the busy phases plus the
 * three terminal states. Mirrors `BadgeCreationStatus` with `idle`/`loading`
 * dropped (nothing to render pre-bake) and `done` surfaced as `success`, so
 * #449 maps the hook's live `status` onto this (a near-verbatim pass-through,
 * modulo that one rename).
 */
export type FinishBakingStatus =
  | FinishBakingPhase
  | "no-key"
  | "error"
  | "success";

export interface FinishBakingStageProps {
  /** Badge design to preview while the badge is baking / on success. */
  badgeDesign: BadgeDesign;
  /** Mono status label for the busy phases ("Baking your badge…"). */
  label?: string;
  /** Preview size in logical pixels. */
  badgeSize?: number;
  /**
   * Which sub-state to render. Defaults to `"baking"` so existing callers that
   * pass no status keep the plain busy interstitial. Real hook wiring is #449.
   */
  status?: FinishBakingStatus;
  /** Success-state label (full-opacity badge, no spinner). */
  successLabel?: string;
  /** No-key permanent-failure message (shown as an a11y alert). */
  noKeyLabel?: string;
  /** Label for the no-key escape action. */
  noKeyActionLabel?: string;
  /**
   * Escape affordance for the no-key state — the one non-dead-ending path the
   * old completion flow lacked (D4). The button only renders when provided;
   * the navigation destination is #449's job.
   */
  onExitWithoutBadge?: () => void;
  /**
   * Caller-supplied terminal-error copy (shown as an a11y alert). Falls back to
   * a generic English default so the `error` state can never surface a
   * label-less alert; #449 threads real `t()` copy through here.
   */
  errorMessage?: string | null;
  /** Retry-button label for the error state. */
  retryLabel?: string;
  /**
   * Retry callback for the error state. The button only renders when provided.
   * Fires at most once per error until `status` leaves `"error"` (D5).
   */
  onRetry?: () => void;
}

/**
 * Baking interstitial of the finishing flow, modeled as a real state union:
 * the in-flight busy phases show the just-designed badge at reduced opacity
 * with a native spinner; `success` shows it at full opacity with a success
 * label; `no-key` and `error` surface an a11y `alert` with an optional escape
 * or retry action. Presentational only — copy is caller-supplied props with
 * English defaults (D2) and real `useCreateBadge`/navigation wiring stays #449's
 * job. See dev plans for issues #470 and #499.
 */
export function FinishBakingStage({
  badgeDesign,
  label = "Baking your badge…",
  badgeSize = DEFAULT_BADGE_SIZE,
  status = "baking",
  successLabel = "Badge created!",
  noKeyLabel = "Badge signing key unavailable",
  noKeyActionLabel = "Continue without a badge",
  onExitWithoutBadge,
  errorMessage,
  retryLabel = "Retry",
  onRetry,
}: FinishBakingStageProps) {
  const { theme } = useUnistyles();

  // Duplicate-tap guard (D5). The ref makes the guard synchronous so two taps
  // landing in the same frame — before React commits the disabled Button —
  // still fire `onRetry` exactly once. The state drives `Button`'s `loading`
  // prop, flipping `accessibilityState.busy`/`disabled` on the next render.
  const retryFiredRef = useRef(false);
  const [retryPending, setRetryPending] = useState(false);

  useEffect(() => {
    // Re-arm whenever we leave the error state — covers both a successful
    // re-bake and a repeat error surfaced by the same retry.
    if (status !== "error") {
      retryFiredRef.current = false;
      setRetryPending(false);
    }
  }, [status]);

  const handleRetryPress = () => {
    if (retryFiredRef.current) return;
    retryFiredRef.current = true;
    setRetryPending(true);
    onRetry?.();
  };

  const badge = (
    <BadgeRenderer
      design={badgeDesign}
      size={badgeSize}
      testID="finish-baking-badge"
    />
  );

  if (status === "success") {
    return (
      <View
        style={styles.container}
        accessible
        accessibilityRole="none"
        accessibilityLiveRegion="polite"
        accessibilityLabel={successLabel}
        testID="finish-baking-stage"
      >
        {badge}
        <Text variant="mono" style={styles.label}>
          {successLabel}
        </Text>
      </View>
    );
  }

  if (status === "no-key") {
    return (
      <View style={styles.container} testID="finish-baking-stage">
        <View style={styles.badgeDim} testID="finish-baking-badge-dim">
          {badge}
        </View>
        <View style={styles.messageContainer}>
          <View
            accessible
            accessibilityRole="alert"
            accessibilityLabel={noKeyLabel}
            testID="finish-baking-no-key-alert"
          >
            <Text variant="mono" style={styles.label}>
              {noKeyLabel}
            </Text>
          </View>
          {onExitWithoutBadge ? (
            <Button
              label={noKeyActionLabel}
              onPress={onExitWithoutBadge}
              variant="secondary"
              testID="finish-baking-exit-button"
            />
          ) : null}
        </View>
      </View>
    );
  }

  if (status === "error") {
    // Coalesce null/undefined *and* empty/whitespace-only strings to a generic
    // default so the alert always carries an accessible label — never a
    // label-less, empty-text alert.
    const errorText =
      errorMessage != null && errorMessage.trim().length > 0
        ? errorMessage
        : DEFAULT_ERROR_MESSAGE;
    return (
      <View style={styles.container} testID="finish-baking-stage">
        <View style={styles.badgeDim} testID="finish-baking-badge-dim">
          {badge}
        </View>
        <View style={styles.messageContainer}>
          <View
            accessible
            accessibilityRole="alert"
            accessibilityLabel={errorText}
            testID="finish-baking-error-alert"
          >
            <Text variant="mono" style={styles.errorText}>
              {errorText}
            </Text>
          </View>
          {onRetry ? (
            <Button
              label={retryLabel}
              onPress={handleRetryPress}
              variant="secondary"
              loading={retryPending}
              testID="finish-baking-retry-button"
            />
          ) : null}
        </View>
      </View>
    );
  }

  // Busy phases (building/signing/baking/storing) — unchanged interstitial.
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="none"
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}
      testID="finish-baking-stage"
    >
      <View style={styles.badgeDim} testID="finish-baking-badge-dim">
        {badge}
      </View>
      <ActivityIndicator size="small" color={theme.colors.text} />
      <Text variant="mono" style={styles.label}>
        {label}
      </Text>
    </View>
  );
}
