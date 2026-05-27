import React from "react";
import { render, fireEvent, screen } from "@testing-library/react-native";
import { ErrorBoundary } from "../ErrorBoundary";
import { Text } from "react-native";
import { reportError } from "../../../services/sentry-report";
import { i18n } from "../../../i18n";

jest.mock("../../../services/sentry-report", () => ({
  reportError: jest.fn(),
}));

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Test error");
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
    (reportError as jest.Mock).mockClear();
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
    expect(screen.getByText("Test error")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: i18n.t("common:errorBoundary.retry"),
      }),
    ).toBeTruthy();
  });

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

  it("reports rendered errors via reportError with area=render", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(reportError).toHaveBeenCalledTimes(1);
    const [err, ctx] = (reportError as jest.Mock).mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe("Test error");
    expect(ctx).toEqual({ area: "render" });
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

    it("renders the fallback title + retry as bracketed pseudo copy", async () => {
      await i18n.changeLanguage("pseudo");
      render(
        <ErrorBoundary>
          <ThrowingChild shouldThrow={true} />
        </ErrorBoundary>,
      );
      const title = i18n.t("common:errorBoundary.title");
      const retry = i18n.t("common:errorBoundary.retry");
      expect(title.startsWith("[")).toBe(true);
      expect(screen.getByText(title)).toBeTruthy();
      expect(screen.getByRole("button", { name: retry })).toBeTruthy();
    });
  });
});
