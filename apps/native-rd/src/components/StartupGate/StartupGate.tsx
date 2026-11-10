import React, {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { View } from "react-native";
import { reloadAppAsync } from "expo";
import { useTranslation } from "react-i18next";
import { Text } from "../Text";
import { Button } from "../Button";
import { evolu } from "../../db";
import { useUserSettingsRow } from "../../hooks/useUserSettingsRow";
import { reportError, type ReportContext } from "../../services/sentry-report";
import { styles } from "./StartupGate.styles";

/**
 * How long startup may take before the failure screen offers a restart.
 *
 * A healthy launch opens SQLite and lands the first user-settings row in well
 * under a second; a cold first launch on an older device, or a large database,
 * can take a few seconds. 15 s is several times that worst healthy case, so a
 * merely slow launch never sees the error — and if the row does land after the
 * bound, the gate drops the failure screen and shows the app anyway.
 */
export const STARTUP_TIMEOUT_MS = 15_000;

type EvoluErrorKind = Extract<ReportContext, { area: "db.evolu" }>["kind"];

/** The subset of the Evolu instance the gate needs; injectable for tests. */
export interface EvoluErrorSource {
  subscribeError: (listener: () => void) => () => void;
  getError: () => unknown;
}

/**
 * Maps an `EvoluError` to a closed kind for Sentry. Reads only the library's
 * own `type` discriminator, never the payload (which can hold SQL or values).
 */
export function evoluErrorKind(error: unknown): EvoluErrorKind {
  const type =
    typeof error === "object" && error !== null && "type" in error
      ? (error as { type: unknown }).type
      : undefined;
  if (typeof type !== "string") return "unknown";
  if (type === "SqliteError") return "sqlite";
  if (type === "TransferableError") return "transferable";
  if (type === "SymmetricCryptoDecryptError") return "crypto";
  if (type.startsWith("Protocol")) return "protocol";
  if (type.startsWith("Timestamp")) return "timestamp";
  return "unknown";
}

/** Renders nothing; reports once the user-settings row exists. */
function SettingsReadyProbe({ onReady }: { onReady: () => void }) {
  const { isLoading } = useUserSettingsRow();
  useEffect(() => {
    if (!isLoading) onReady();
  }, [isLoading, onReady]);
  return null;
}

interface StartupGateProps {
  children: ReactNode;
  /** Defaults to the app's Evolu instance. */
  errorSource?: EvoluErrorSource;
  /** Defaults to a full JS reload via `expo`'s `reloadAppAsync`. */
  onRestart?: () => Promise<void>;
}

/**
 * Wraps the app below the Evolu provider and gives startup an error path.
 *
 * `useQuery` suspends until Evolu answers, so a broken SQLite open used to
 * leave the app suspended on a blank view forever with nothing sent to Sentry.
 * The gate:
 * - holds the Suspense boundary (a themed blank view while loading),
 * - subscribes to Evolu's error channel for the app's lifetime and reports
 *   every error under `area: "db.evolu"`,
 * - shows a translated restart screen when Evolu errors before the settings
 *   row exists, or when the row hasn't landed after `STARTUP_TIMEOUT_MS`.
 *
 * The children stay mounted under the failure screen, so if loading finishes
 * late the failure screen goes away and the app appears.
 */
export function StartupGate({
  children,
  errorSource = evolu,
  onRestart = () => reloadAppAsync("startup-failure"),
}: StartupGateProps) {
  const { t } = useTranslation(["common"]);
  const [isReady, setIsReady] = useState(false);
  const [hasEvoluError, setHasEvoluError] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const isReadyRef = useRef(false);

  const markReady = useCallback(() => {
    isReadyRef.current = true;
    setIsReady(true);
  }, []);

  useEffect(() => {
    let lastReported: unknown = null;
    const check = () => {
      const error = errorSource.getError();
      if (error == null || error === lastReported) return;
      lastReported = error;
      const kind = evoluErrorKind(error);
      // A synthetic Error carries the closed kind only — the Evolu payload
      // never leaves the device.
      reportError(new Error(`Evolu error: ${kind}`), {
        area: "db.evolu",
        kind,
      });
      if (!isReadyRef.current) setHasEvoluError(true);
    };
    check();
    return errorSource.subscribeError(check);
  }, [errorSource]);

  useEffect(() => {
    if (isReady) return;
    const timer = setTimeout(() => {
      reportError(new Error("Startup timed out"), {
        area: "db.startup",
        kind: "timeout",
      });
      setHasTimedOut(true);
    }, STARTUP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isReady, attempt]);

  const handleRestart = useCallback(() => {
    onRestart().catch(() => {
      // Reload unavailable: give startup another full window in place.
      setHasEvoluError(false);
      setHasTimedOut(false);
      setAttempt((n) => n + 1);
    });
  }, [onRestart]);

  const showFailure = !isReady && (hasEvoluError || hasTimedOut);

  // The fallback shares ThemedApp's `app-loading` testID on purpose: both are
  // the bare pre-app view E2E's boot barrier asserts away, and the Suspense
  // fallback replaces the children, so the two never render together.
  return (
    <>
      <Suspense fallback={<View testID="app-loading" style={styles.loading} />}>
        <SettingsReadyProbe onReady={markReady} />
        {children}
      </Suspense>
      {showFailure ? (
        <View
          testID="startup-failure"
          style={styles.failure}
          accessibilityRole="alert"
          accessibilityLabel={t("common:startupError.a11yAlert")}
        >
          <View style={styles.card}>
            <Text variant="title" style={styles.title}>
              {t("common:startupError.title")}
            </Text>
            <Text variant="body" style={styles.message}>
              {t("common:startupError.message")}
            </Text>
            <View style={styles.action}>
              <Button
                label={t("common:startupError.restart")}
                onPress={handleRestart}
                variant="primary"
              />
            </View>
          </View>
        </View>
      ) : null}
    </>
  );
}
