import React from "react";
import { render, screen } from "@testing-library/react-native";

import { PhotoContent } from "../PhotoContent";
import { i18n } from "../../../i18n";

describe("PhotoContent", () => {
  it("renders the load-failure text from the common namespace when uri is null", () => {
    render(<PhotoContent uri={null} />);
    expect(
      screen.getByText(i18n.t("common:evidenceContent.errors.imageLoadFailed")),
    ).toBeTruthy();
  });

  describe("pseudo locale (proves i18n routing)", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    it("renders the load-failure text as bracketed pseudo copy", async () => {
      await i18n.changeLanguage("pseudo");
      render(<PhotoContent uri={null} />);
      const failed = i18n.t("common:evidenceContent.errors.imageLoadFailed");
      expect(failed.startsWith("[")).toBe(true);
      expect(screen.getByText(failed)).toBeTruthy();
    });
  });
});
