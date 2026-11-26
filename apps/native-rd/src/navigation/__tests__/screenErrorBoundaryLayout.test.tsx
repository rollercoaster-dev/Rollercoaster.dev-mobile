/**
 * The screen layout resets its boundary when the route gets new params, so a
 * screen that threw on one input renders again with the next (#266). Called
 * directly with a `route`, the way React Navigation's useDescriptors does.
 */
import React from "react";
import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { screenErrorBoundaryLayout } from "../screenErrorBoundary";

jest.mock("../../services/sentry-report", () => ({
  reportRenderError: jest.fn(),
}));

function Screen({ broken }: { broken: boolean }) {
  if (broken) throw new Error("bad params");
  return <Text>Screen content</Text>;
}

const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

function Layout({ params, broken }: { params: object; broken: boolean }) {
  return screenErrorBoundaryLayout({
    route: { params },
    children: <Screen broken={broken} />,
  });
}

describe("screenErrorBoundaryLayout", () => {
  const paramsA = { goalId: "a" };

  it("renders the screen again when the route gets new params", () => {
    const { rerender } = render(<Layout params={paramsA} broken={true} />);
    expect(screen.getByTestId("error-boundary-fallback-screen")).toBeTruthy();

    rerender(<Layout params={{ goalId: "b" }} broken={false} />);

    expect(screen.getByText("Screen content")).toBeTruthy();
  });

  it("keeps the fallback while the params stay the same", () => {
    const { rerender } = render(<Layout params={paramsA} broken={true} />);

    rerender(<Layout params={paramsA} broken={false} />);

    expect(screen.getByTestId("error-boundary-fallback-screen")).toBeTruthy();
  });
});
