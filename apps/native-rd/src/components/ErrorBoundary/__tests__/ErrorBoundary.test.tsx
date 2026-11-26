import React from "react";
import { render, fireEvent, screen, act } from "@testing-library/react-native";
import { ErrorBoundary } from "../ErrorBoundary";
import { AccessibilityInfo, Text } from "react-native";
import { reportRenderError } from "../../../services/sentry-report";
import { i18n } from "../../../i18n";

jest.mock("../../../services/sentry-report", () => ({
  reportRenderError: jest.fn(),
}));

// findNodeHandle is a lazy getter on react-native's index, so jest.spyOn can't
// reach it; the test renderer has no native tags, so hand back a fixed one.
const TITLE_TAG = 222;
jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  Object.defineProperty(RN, "findNodeHandle", {
    configurable: true,
    value: jest.fn(() => 222),
  });
  return RN;
});

function ThrowingChild({
  shouldThrow,
  message = "Test error",
}: {
  shouldThrow: boolean;
  message?: string;
}) {
  if (shouldThrow) throw new Error(message);
  return <Text>Child content</Text>;
}

// Suppress console.error for expected errors in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = typeof args[0] === "string" ? args[0] : "";
    if (msg.includes("ErrorBoundary caught") || msg.includes("The above error"))
      return;
    originalConsoleError(...args);
  };
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe("ErrorBoundary", () => {
  beforeEach(() => {
    (reportRenderError as jest.Mock).mockClear();
  });

  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Child content")).toBeTruthy();
  });

  it("shows fallback UI when child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText(i18n.t("common:errorBoundary.title"))).toBeTruthy();
    expect(
      screen.getByText(i18n.t("common:errorBoundary.message")),
    ).toBeTruthy();
    expect(screen.queryByText("Test error")).toBeNull();
    expect(
      screen.getByRole("button", {
        name: i18n.t("common:errorBoundary.retry"),
      }),
    ).toBeTruthy();
  });

  it.each(["/Users/someone/private/path", ""])(
    "never displays exception detail in the default fallback (message: %j)",
    (message) => {
      render(
        <ErrorBoundary>
          <ThrowingChild shouldThrow={true} message={message} />
        </ErrorBoundary>,
      );

      expect(
        screen.getByText(i18n.t("common:errorBoundary.message")),
      ).toBeTruthy();
      if (message) expect(screen.queryByText(message)).toBeNull();
    },
  );

  it("has accessible alert role and label on fallback container", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(
      screen.getByLabelText(i18n.t("common:errorBoundary.a11yAlert")),
    ).toBeTruthy();
  });

  describe("screen-reader focus", () => {
    let setFocus: jest.SpyInstance;

    beforeEach(() => {
      jest.useFakeTimers();
      setFocus = jest
        .spyOn(AccessibilityInfo, "setAccessibilityFocus")
        .mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.useRealTimers();
      setFocus.mockRestore();
    });

    it.each(["screen", "root", "compact"] as const)(
      "moves focus to the %s fallback once it appears",
      (variant) => {
        const { rerender } = render(
          <ErrorBoundary variant={variant}>
            <ThrowingChild shouldThrow={false} />
          </ErrorBoundary>,
        );
        act(() => {
          jest.runOnlyPendingTimers();
        });
        expect(setFocus).not.toHaveBeenCalled();

        rerender(
          <ErrorBoundary variant={variant}>
            <ThrowingChild shouldThrow={true} />
          </ErrorBoundary>,
        );
        act(() => {
          jest.runOnlyPendingTimers();
        });

        expect(
          screen.getByTestId(`error-boundary-title-${variant}`),
        ).toBeTruthy();
        expect(setFocus).toHaveBeenCalledTimes(1);
        expect(setFocus).toHaveBeenCalledWith(TITLE_TAG);
      },
    );

    it("drops the pending focus when Try Again recovers first", () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowingChild shouldThrow={true} />
        </ErrorBoundary>,
      );
      rerender(
        <ErrorBoundary>
          <ThrowingChild shouldThrow={false} />
        </ErrorBoundary>,
      );
      fireEvent.press(
        screen.getByRole("button", {
          name: i18n.t("common:errorBoundary.retry"),
        }),
      );
      act(() => {
        jest.runOnlyPendingTimers();
      });

      expect(screen.getByText("Child content")).toBeTruthy();
      expect(setFocus).not.toHaveBeenCalled();
    });

    it("leaves focus to a custom fallback", () => {
      render(
        <ErrorBoundary fallback={() => <Text>Custom</Text>}>
          <ThrowingChild shouldThrow={true} />
        </ErrorBoundary>,
      );
      act(() => {
        jest.runOnlyPendingTimers();
      });

      expect(screen.getByText("Custom")).toBeTruthy();
      expect(setFocus).not.toHaveBeenCalled();
    });
  });

  it("resets error state on Try Again press", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText(i18n.t("common:errorBoundary.title"))).toBeTruthy();

    // Re-render with non-throwing child before pressing reset
    rerender(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>,
    );

    fireEvent.press(
      screen.getByRole("button", {
        name: i18n.t("common:errorBoundary.retry"),
      }),
    );

    expect(screen.getByText("Child content")).toBeTruthy();
    expect(screen.queryByText(i18n.t("common:errorBoundary.title"))).toBeNull();
  });

  it("reports rendered errors with React's component stack", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(reportRenderError).toHaveBeenCalledTimes(1);
    const [err, componentStack] = (reportRenderError as jest.Mock).mock
      .calls[0];
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe("Test error");
    // React's tree path to the crash, which runs up through the boundary.
    // (Jest's source maps rename the throwing child's frame, so pin the
    // boundary frame.)
    expect(componentStack).toEqual(expect.stringContaining("at ErrorBoundary"));
  });

  describe("console logging", () => {
    const devGlobal = global as unknown as { __DEV__: boolean };
    const originalDev = devGlobal.__DEV__;
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
      errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
      devGlobal.__DEV__ = originalDev;
      errorSpy.mockRestore();
    });

    const boundaryLogs = () =>
      errorSpy.mock.calls.filter((args) => args[0] === "ErrorBoundary caught:");

    it("logs the caught error to the console in dev", () => {
      devGlobal.__DEV__ = true;
      render(
        <ErrorBoundary>
          <ThrowingChild shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(boundaryLogs()).toHaveLength(1);
    });

    it("leaves production logging to the Sentry report", () => {
      devGlobal.__DEV__ = false;
      render(
        <ErrorBoundary>
          <ThrowingChild shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(reportRenderError).toHaveBeenCalledTimes(1);
      expect(boundaryLogs()).toHaveLength(0);
    });
  });

  it("uses custom fallback when provided", () => {
    render(
      <ErrorBoundary
        fallback={(error, _reset) => (
          <Text testID="custom-fallback">Custom: {error.message}</Text>
        )}
      >
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId("custom-fallback")).toBeTruthy();
    expect(screen.getByText("Custom: Test error")).toBeTruthy();
    expect(screen.queryByText(i18n.t("common:errorBoundary.title"))).toBeNull();
  });

  describe("pseudo locale (proves fallback routes through i18n singleton)", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    it("renders the fallback title, message, and retry as pseudo copy", async () => {
      await i18n.changeLanguage("pseudo");
      render(
        <ErrorBoundary>
          <ThrowingChild shouldThrow={true} />
        </ErrorBoundary>,
      );
      const title = i18n.t("common:errorBoundary.title");
      const message = i18n.t("common:errorBoundary.message");
      const retry = i18n.t("common:errorBoundary.retry");
      expect(title.startsWith("[")).toBe(true);
      expect(message.startsWith("[")).toBe(true);
      expect(screen.getByText(title)).toBeTruthy();
      expect(screen.getByText(message)).toBeTruthy();
      expect(screen.queryByText("Test error")).toBeNull();
      expect(screen.getByRole("button", { name: retry })).toBeTruthy();
    });
  });
});
