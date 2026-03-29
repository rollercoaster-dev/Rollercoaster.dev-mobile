import React from "react";
import { View } from "react-native";

export function useVideoPlayer() {
  return {
    play: jest.fn(),
    pause: jest.fn(),
    loop: false,
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  };
}

export function VideoView(props: Record<string, unknown>) {
  return React.createElement(View, { testID: "video-player", ...props });
}

export function isPictureInPictureSupported() {
  return false;
}

export function clearVideoCacheAsync() {
  return Promise.resolve();
}

export function setVideoCacheSizeAsync() {
  return Promise.resolve();
}

export function getCurrentVideoCacheSize() {
  return 0;
}
