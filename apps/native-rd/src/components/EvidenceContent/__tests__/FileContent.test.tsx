import React from "react";
import { render, screen } from "@testing-library/react-native";
import { FileContent } from "../FileContent";
import { i18n } from "../../../i18n";

jest.mock("../../../utils/evidenceViewers", () => ({
  openFile: jest.fn(() => Promise.resolve()),
  tryParseJSON: jest.fn(() => null),
}));

describe("FileContent", () => {
  it("renders the Open button label from the common namespace", () => {
    render(<FileContent uri="/tmp/report.pdf" />);
    expect(
      screen.getByText(i18n.t("common:evidenceContent.openFile")),
    ).toBeTruthy();
  });

  describe("pseudo locale (proves i18n routing)", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    it("renders the Open button label as bracketed pseudo copy", async () => {
      await i18n.changeLanguage("pseudo");
      render(<FileContent uri="/tmp/report.pdf" />);
      const open = i18n.t("common:evidenceContent.openFile");
      expect(open.startsWith("[")).toBe(true);
      expect(screen.getByText(open)).toBeTruthy();
    });
  });
});
