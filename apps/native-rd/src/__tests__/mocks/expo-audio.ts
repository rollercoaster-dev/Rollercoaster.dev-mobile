/**
 * Mock for expo-audio module
 *
 * Provides controllable mock implementations for AudioRecorder,
 * AudioPlayer, and permission/mode functions.
 */

const mockRecorderInstance = {
  prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
  record: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  isRecording: false,
  uri: "file:///mock-recording.m4a",
  getStatus: jest.fn(() => ({
    canRecord: false,
    isRecording: false,
    durationMillis: 5000,
    mediaServicesDidReset: false,
    url: "file:///mock-recording.m4a",
  })),
};

const mockPlayerInstance = {
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn(),
  replace: jest.fn(),
  currentTime: 0,
  duration: 5,
  playing: false,
  loop: false,
  muted: false,
  volume: 1,
  isLoaded: true,
};

const mockPlayerStatus = {
  id: 1,
  currentTime: 0,
  playbackState: "idle",
  timeControlStatus: "paused",
  reasonForWaitingToPlay: "",
  mute: false,
  duration: 5,
  playing: false,
  loop: false,
  didJustFinish: false,
  isBuffering: false,
  isLoaded: true,
  playbackRate: 1,
  shouldCorrectPitch: true,
};

module.exports = {
  useAudioRecorder: jest.fn(() => mockRecorderInstance),
  useAudioPlayer: jest.fn(() => mockPlayerInstance),
  useAudioPlayerStatus: jest.fn(() => mockPlayerStatus),
  requestRecordingPermissionsAsync: jest.fn(() =>
    Promise.resolve({
      granted: true,
      status: "granted",
      canAskAgain: true,
      expires: "never",
    }),
  ),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  RecordingPresets: {
    HIGH_QUALITY: {
      extension: ".m4a",
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
      android: { outputFormat: "mpeg4", audioEncoder: "aac" },
      ios: { audioQuality: 127, outputFormat: "aac " },
      web: { mimeType: "audio/webm", bitsPerSecond: 128000 },
    },
  },
  // Expose mock instances for test assertions
  __mockRecorderInstance: mockRecorderInstance,
  __mockPlayerInstance: mockPlayerInstance,
  __mockPlayerStatus: mockPlayerStatus,
};
