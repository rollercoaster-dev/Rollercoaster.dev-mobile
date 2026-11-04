import React from "react";
import { Text } from "react-native";
import { renderWithProviders, screen } from "../../../__tests__/test-utils";
import { mockFontScale } from "../../../__tests__/fontScale";
import { ScrollAtLargeType } from "../ScrollAtLargeType";

function renderBody() {
  renderWithProviders(
    <ScrollAtLargeType
      testID="body"
      style={{ flex: 1, justifyContent: "center" }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
    >
      <Text>content</Text>
    </ScrollAtLargeType>,
  );
}

describe("ScrollAtLargeType", () => {
  it("renders the fixed View at default size", () => {
    renderBody();
    const body = screen.getByTestId("body");
    expect(body.type).toBe("View");
    expect(body.props.style).toEqual({ flex: 1, justifyContent: "center" });
    expect(screen.getByText("content")).toBeTruthy();
  });

  it.each([1.3, 2])("scrolls at font scale %s", (fontScale) => {
    renderBody();
    mockFontScale(fontScale);
    const body = screen.getByTestId("body");
    expect(body.type).toBe("RCTScrollView");
    expect(body.props.contentContainerStyle).toEqual({
      flexGrow: 1,
      justifyContent: "center",
    });
    expect(body.props.keyboardShouldPersistTaps).toBe("handled");
    expect(screen.getByText("content")).toBeTruthy();
  });

  it("stays fixed just below the large-type threshold", () => {
    renderBody();
    mockFontScale(1.2);
    expect(screen.getByTestId("body").type).toBe("View");
  });
});
