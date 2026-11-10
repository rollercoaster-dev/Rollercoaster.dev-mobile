import React from "react";
import { AccessibilityInfo, Text } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { i18n } from "../../../i18n";
import { reportError } from "../../../services/sentry-report";
import {
  StartupGate,
  STARTUP_TIMEOUT_MS,
  evoluErrorKind,
  type EvoluErrorSource,
} from "..";

jest.mock("../../../services/sentry-report", () => ({
  reportError: jest.fn(),
}));

jest.mock("expo", () => ({ reloadAppAsync: jest.fn() }));

const mockSettings = { isLoading: true };
jest.mock("../../../hooks/useUserSettingsRow", () => ({
  useUserSettingsRow: () => ({
    settings: mockSettings.isLoading ? null : { id: "s1" },
    isLoading: mockSettings.isLoading,
  }),
}));

function createErrorSource() {
  let error: unknown = null;
  const listeners = new Set<() => void>();
  const source: EvoluErrorSource = {
    subscribeError: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getError: () => error,
  };
  return {
    source,
    emit(next: unknown) {
      error = next;
      act(() => listeners.forEach((l) => l()));
    },
  };
}

function renderGate(
  source: EvoluErrorSource,
  onRestart: () => Promise<void> = jest.fn(() => Promise.resolve()),
) {
  return render(
    <StartupGate errorSource={source} onRestart={onRestart}>
      <Text>app content</Text>
    </StartupGate>,
  );
}

const sqliteError = {
  type: "SqliteError",
  error: { type: "TransferableError", error: "SELECT secret FROM goals" },
};

beforeEach(() => {
  jest.useFakeTimers();
  mockSettings.isLoading = true;
  (reportError as jest.Mock).mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("StartupGate", () => {
  it("waits out a slow launch and shows the failure screen only at the bound", () => {
    const { source } = createErrorSource();
    renderGate(source);

    act(() => jest.advanceTimersByTime(STARTUP_TIMEOUT_MS - 1));
    expect(screen.queryByTestId("startup-failure")).toBeNull();
    expect(reportError).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1));
    expect(screen.getByTestId("startup-failure")).toBeTruthy();
    expect(screen.getByText(i18n.t("common:startupError.title"))).toBeTruthy();
    expect(
      screen.getByLabelText(i18n.t("common:startupError.a11yAlert")),
    ).toBeTruthy();
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), {
      area: "db.startup",
      kind: "timeout",
    });
  });

  it("never times out once the settings row has landed", () => {
    mockSettings.isLoading = false;
    const { source } = createErrorSource();
    renderGate(source);

    act(() => jest.advanceTimersByTime(STARTUP_TIMEOUT_MS * 2));
    expect(screen.queryByTestId("startup-failure")).toBeNull();
    expect(reportError).not.toHaveBeenCalled();
    expect(screen.getByText("app content")).toBeTruthy();
  });

  it("drops the failure screen when the row lands after the bound", () => {
    const { source } = createErrorSource();
    const view = renderGate(source);
    act(() => jest.advanceTimersByTime(STARTUP_TIMEOUT_MS));
    expect(screen.getByTestId("startup-failure")).toBeTruthy();

    mockSettings.isLoading = false;
    view.rerender(
      <StartupGate errorSource={source}>
        <Text>app content</Text>
      </StartupGate>,
    );
    expect(screen.queryByTestId("startup-failure")).toBeNull();
    expect(screen.getByText("app content")).toBeTruthy();
  });

  it("announces the failure screen to screen readers when it appears", () => {
    const announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => {});
    // RN's jest setup already mocks this; drop calls from earlier tests.
    announce.mockClear();
    const { source, emit } = createErrorSource();
    renderGate(source);
    expect(announce).not.toHaveBeenCalled();

    emit(sqliteError);
    expect(announce).toHaveBeenCalledWith(
      i18n.t("common:startupError.a11yAlert"),
    );
    announce.mockRestore();
  });

  test.each([{ type: "ProtocolSyncError" }, { type: "TimestampDriftError" }])(
    "reports but does not block startup on a sync-layer error (%j)",
    (syncError) => {
      const { source, emit } = createErrorSource();
      renderGate(source);
      emit(syncError);
      expect(reportError).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId("startup-failure")).toBeNull();
    },
  );

  it("reports each Evolu error kind once per session", () => {
    mockSettings.isLoading = false;
    const { source, emit } = createErrorSource();
    renderGate(source);
    emit({ type: "ProtocolSyncError" });
    emit({ type: "ProtocolSyncError" });
    emit({ type: "ProtocolWriteError" });
    expect(reportError).toHaveBeenCalledTimes(1);

    emit(sqliteError);
    expect(reportError).toHaveBeenCalledTimes(2);
    expect(reportError).toHaveBeenLastCalledWith(expect.any(Error), {
      area: "db.evolu",
      kind: "sqlite",
    });
  });

  it("shows the failure screen at once when Evolu errors during startup", () => {
    const { source, emit } = createErrorSource();
    renderGate(source);
    expect(screen.queryByTestId("startup-failure")).toBeNull();

    emit(sqliteError);
    expect(screen.getByTestId("startup-failure")).toBeTruthy();
    expect(reportError).toHaveBeenCalledTimes(1);
    const [err, ctx] = (reportError as jest.Mock).mock.calls[0];
    expect(ctx).toEqual({ area: "db.evolu", kind: "sqlite" });
    // Only the closed kind leaves the device, never the Evolu payload.
    expect((err as Error).message).toBe("Evolu error: sqlite");
  });

  it("reports an error that was already set before mount", () => {
    const { source } = createErrorSource();
    const preset = { ...source, getError: () => sqliteError };
    renderGate(preset);
    expect(screen.getByTestId("startup-failure")).toBeTruthy();
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), {
      area: "db.evolu",
      kind: "sqlite",
    });
  });

  it("reports Evolu errors after startup without blocking the app", () => {
    mockSettings.isLoading = false;
    const { source, emit } = createErrorSource();
    renderGate(source);

    emit({ type: "ProtocolSyncError" });
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), {
      area: "db.evolu",
      kind: "protocol",
    });
    expect(screen.queryByTestId("startup-failure")).toBeNull();
    expect(screen.getByText("app content")).toBeTruthy();
  });

  it("restarts the app from the failure screen", () => {
    const { source, emit } = createErrorSource();
    const onRestart = jest.fn(() => Promise.resolve());
    renderGate(source, onRestart);
    emit(sqliteError);

    fireEvent.press(
      screen.getByRole("button", {
        name: i18n.t("common:startupError.restart"),
      }),
    );
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it("re-arms the startup window when a restart is unavailable", async () => {
    const { source } = createErrorSource();
    renderGate(source, () => Promise.reject(new Error("no reload")));
    act(() => jest.advanceTimersByTime(STARTUP_TIMEOUT_MS));

    fireEvent.press(
      screen.getByRole("button", {
        name: i18n.t("common:startupError.restart"),
      }),
    );
    await act(async () => {});
    expect(screen.queryByTestId("startup-failure")).toBeNull();

    act(() => jest.advanceTimersByTime(STARTUP_TIMEOUT_MS));
    expect(screen.getByTestId("startup-failure")).toBeTruthy();
  });

  describe("pseudo locale", () => {
    afterEach(async () => {
      if (i18n.language !== "en")
        await act(async () => {
          await i18n.changeLanguage("en");
        });
    });

    test.each([
      "common:startupError.title",
      "common:startupError.message",
      "common:startupError.restart",
    ] as const)("renders %s as bracketed copy under pseudo", async (key) => {
      await i18n.changeLanguage("pseudo");
      const { source, emit } = createErrorSource();
      renderGate(source);
      emit(sqliteError);
      const pseudo = i18n.t(key);
      expect(pseudo.startsWith("[")).toBe(true);
      expect(screen.getByText(pseudo)).toBeTruthy();
    });
  });
});

describe("evoluErrorKind", () => {
  test.each([
    [{ type: "SqliteError" }, "sqlite"],
    [{ type: "TransferableError" }, "transferable"],
    [{ type: "SymmetricCryptoDecryptError" }, "crypto"],
    [{ type: "ProtocolWriteError" }, "protocol"],
    [{ type: "TimestampDriftError" }, "timestamp"],
    [{ type: "SomethingNew" }, "unknown"],
    ["not an object", "unknown"],
    [{ type: 42 }, "unknown"],
  ])("maps %j to %s", (error, kind) => {
    expect(evoluErrorKind(error)).toBe(kind);
  });
});
