import React from "react";
import { render, screen } from "@testing-library/react-native";
import { VideoContent } from "../VideoContent";
import { i18n } from "../../../i18n";

jest.mock("expo-video", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native");
  return {
    useVideoPlayer: jest.fn(() => ({
      play: jest.fn(),
      pause: jest.fn(),
      loop: false,
      addListener: jest.fn(() => ({ remove: jest.fn() })),
    })),
    VideoView: (props: Record<string, unknown>) =>
      View({ testID: "video-player", ...props }),
  };
});

describe("VideoContent", () => {
  it("renders the load-failure text from the common namespace when uri is null", () => {
    render(<VideoContent uri={null} />);
    expect(
      screen.getByText(i18n.t("common:evidenceContent.errors.videoLoadFailed")),
    ).toBeTruthy();
  });

  describe("pseudo locale (proves i18n routing)", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    it("renders the load-failure text as bracketed pseudo copy", async () => {
      await i18n.changeLanguage("pseudo");
      render(<VideoContent uri={null} />);
      const failed = i18n.t("common:evidenceContent.errors.videoLoadFailed");
      expect(failed.startsWith("[")).toBe(true);
      expect(screen.getByText(failed)).toBeTruthy();
    });
  });
});
