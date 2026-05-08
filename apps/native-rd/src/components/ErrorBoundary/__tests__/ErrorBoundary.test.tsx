import React from "react";
import { render, fireEvent, screen } from "@testing-library/react-native";
import { ErrorBoundary } from "../ErrorBoundary";
import { Text } from "react-native";
import { reportError } from "../../../services/sentry-report";

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

    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("Test error")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try Again" })).toBeTruthy();
  });

  it("has accessible alert role and label on fallback container", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByLabelText("Error: something went wrong")).toBeTruthy();
  });

  it("resets error state on Try Again press", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeTruthy();

    // Re-render with non-throwing child before pressing reset
    rerender(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>,
    );

    fireEvent.press(screen.getByRole("button", { name: "Try Again" }));

    expect(screen.getByText("Child content")).toBeTruthy();
    expect(screen.queryByText("Something went wrong")).toBeNull();
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
    expect(screen.queryByText("Something went wrong")).toBeNull();
  });
});
