import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { AudioPlayerModal } from "../AudioPlayerModal";
import { i18n } from "../../../i18n";

jest.mock("expo-audio", () => ({
  useAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(),
  })),
  useAudioPlayerStatus: jest.fn(() => ({
    playing: false,
    currentTime: 0,
    duration: 0,
    didJustFinish: false,
  })),
}));

describe("AudioPlayerModal", () => {
  it("renders nothing when uri is null", () => {
    const { toJSON } = render(
      <AudioPlayerModal visible={true} uri={null} onClose={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it("renders audio player when visible with uri", () => {
    render(
      <AudioPlayerModal visible={true} uri="/audio.m4a" onClose={jest.fn()} />,
    );
    expect(
      screen.getByText(i18n.t("common:viewerModals.heading.audio")),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(i18n.t("common:viewerModals.a11y.closeAudio")),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(i18n.t("common:audioPlayer.a11y.container")),
    ).toBeTruthy();
  });

  it("calls onClose when close button is pressed", () => {
    const onClose = jest.fn();
    render(
      <AudioPlayerModal visible={true} uri="/audio.m4a" onClose={onClose} />,
    );
    fireEvent.press(
      screen.getByLabelText(i18n.t("common:viewerModals.a11y.closeAudio")),
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
        <AudioPlayerModal
          visible={true}
          uri="/audio.m4a"
          onClose={jest.fn()}
        />,
      );
      const heading = i18n.t("common:viewerModals.heading.audio");
      expect(heading.startsWith("[")).toBe(true);
      expect(screen.getByText(heading)).toBeTruthy();
      expect(
        screen.getByLabelText(i18n.t("common:viewerModals.a11y.closeAudio")),
      ).toBeTruthy();
    });
  });
});
