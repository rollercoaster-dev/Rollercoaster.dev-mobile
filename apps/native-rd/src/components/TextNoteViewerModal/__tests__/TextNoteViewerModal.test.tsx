import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { TextNoteViewerModal } from "../TextNoteViewerModal";
import { i18n } from "../../../i18n";

describe("TextNoteViewerModal", () => {
  it("renders nothing when text is null", () => {
    const { toJSON } = render(
      <TextNoteViewerModal visible={true} text={null} onClose={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it("renders text when visible", () => {
    render(
      <TextNoteViewerModal
        visible={true}
        text="My progress notes for today"
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText("My progress notes for today")).toBeTruthy();
    expect(
      screen.getByText(i18n.t("common:viewerModals.heading.textNote")),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(i18n.t("common:viewerModals.a11y.closeTextNote")),
    ).toBeTruthy();
  });

  it("calls onClose when close button is pressed", () => {
    const onClose = jest.fn();
    render(
      <TextNoteViewerModal visible={true} text="Some text" onClose={onClose} />,
    );
    fireEvent.press(
      screen.getByLabelText(i18n.t("common:viewerModals.a11y.closeTextNote")),
    );
    expect(onClose).toHaveBeenCalled();
  });

  describe("pseudo locale (proves i18n routing)", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    it("renders heading + close label as bracketed pseudo copy", async () => {
      await i18n.changeLanguage("pseudo");
      render(
        <TextNoteViewerModal visible={true} text="Body" onClose={jest.fn()} />,
      );
      const heading = i18n.t("common:viewerModals.heading.textNote");
      expect(heading.startsWith("[")).toBe(true);
      expect(screen.getByText(heading)).toBeTruthy();
      expect(
        screen.getByLabelText(i18n.t("common:viewerModals.a11y.closeTextNote")),
      ).toBeTruthy();
    });
  });

  it("shows timestamp when provided", () => {
    render(
      <TextNoteViewerModal
        visible={true}
        text="Notes"
        createdAt="2026-02-11"
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText("2026-02-11")).toBeTruthy();
  });
});
