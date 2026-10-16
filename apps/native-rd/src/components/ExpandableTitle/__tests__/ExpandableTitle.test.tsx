import React from "react";
import {
  fireEvent,
  renderWithProviders,
  screen,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { ExpandableTitle } from "../ExpandableTitle";

const TITLE = "A very long goal title that should remain fully readable";

function measure(lineCount: number) {
  fireEvent(
    screen.getByTestId("title-measure", { includeHiddenElements: true }),
    "textLayout",
    {
      nativeEvent: {
        lines: Array.from({ length: lineCount }, (_, i) => ({ text: `l${i}` })),
      },
    },
  );
}

describe("ExpandableTitle", () => {
  it("shows no toggle while the full text fits the clamp", () => {
    renderWithProviders(
      <ExpandableTitle title="Short" variant="title" testID="title" />,
    );
    measure(1);
    expect(screen.getByTestId("title").props.numberOfLines).toBe(2);
    expect(screen.queryByTestId("title-toggle")).toBeNull();
  });

  it("expands in place once the text overflows, and collapses again", () => {
    renderWithProviders(
      <ExpandableTitle title={TITLE} variant="title" testID="title" />,
    );
    measure(4);
    const toggle = screen.getByTestId("title-toggle");
    expect(toggle.props.accessibilityLabel).toBe(
      i18n.t("common:expandableTitle.showMore"),
    );
    expect(toggle.props.accessibilityState).toEqual({ expanded: false });

    fireEvent.press(toggle);
    expect(screen.getByTestId("title").props.numberOfLines).toBeUndefined();
    expect(screen.getByTestId("title-toggle").props.accessibilityLabel).toBe(
      i18n.t("common:expandableTitle.showLess"),
    );

    fireEvent.press(screen.getByTestId("title-toggle"));
    expect(screen.getByTestId("title").props.numberOfLines).toBe(2);
  });

  it("expands when the title itself is tapped", () => {
    renderWithProviders(
      <ExpandableTitle title={TITLE} variant="title" testID="title" />,
    );
    measure(3);
    fireEvent.press(screen.getByTestId("title"));
    expect(screen.getByTestId("title").props.numberOfLines).toBeUndefined();
  });

  it("keeps the measuring twin out of the accessibility tree", () => {
    renderWithProviders(
      <ExpandableTitle title={TITLE} variant="title" testID="title" />,
    );
    expect(screen.getAllByText(TITLE)).toHaveLength(1);
    expect(screen.getByRole("header", { name: TITLE })).toBeOnTheScreen();
  });

  it("localizes the toggle", async () => {
    await i18n.changeLanguage("de");
    try {
      renderWithProviders(
        <ExpandableTitle title={TITLE} variant="title" testID="title" />,
      );
      measure(3);
      expect(
        screen.getByText(i18n.t("common:expandableTitle.showMore")),
      ).toBeOnTheScreen();
    } finally {
      await i18n.changeLanguage("en");
    }
  });
});
