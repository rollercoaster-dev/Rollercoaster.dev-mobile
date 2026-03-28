/**
 * Mock for expo-av Audio module
 *
 * Provides controllable mock implementations for Audio.Recording,
 * Audio.Sound, and permission functions.
 */

const mockRecordingInstance = {
  prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
  startAsync: jest.fn().mockResolvedValue(undefined),
  stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
  pauseAsync: jest.fn().mockResolvedValue(undefined),
  getURI: jest.fn(() => 'file:///mock-recording.m4a'),
  getStatusAsync: jest.fn(() =>
    Promise.resolve({
      canRecord: false,
      isRecording: false,
      isDoneRecording: true,
      durationMillis: 5000,
    }),
  ),
  setOnRecordingStatusUpdate: jest.fn(),
};

const mockSoundInstance = {
  playAsync: jest.fn().mockResolvedValue(undefined),
  stopAsync: jest.fn().mockResolvedValue(undefined),
  unloadAsync: jest.fn().mockResolvedValue(undefined),
  setOnPlaybackStatusUpdate: jest.fn(),
};

class MockRecording {
  prepareToRecordAsync = mockRecordingInstance.prepareToRecordAsync;
  startAsync = mockRecordingInstance.startAsync;
  stopAndUnloadAsync = mockRecordingInstance.stopAndUnloadAsync;
  pauseAsync = mockRecordingInstance.pauseAsync;
  getURI = mockRecordingInstance.getURI;
  getStatusAsync = mockRecordingInstance.getStatusAsync;
  setOnRecordingStatusUpdate = mockRecordingInstance.setOnRecordingStatusUpdate;
}

const Audio = {
  Recording: MockRecording,
  Sound: {
    createAsync: jest.fn(() =>
      Promise.resolve({ sound: mockSoundInstance }),
    ),
  },
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: true, status: 'granted', canAskAgain: true, expires: 'never' }),
  ),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  RecordingOptionsPresets: {
    HIGH_QUALITY: {
      android: {},
      ios: {},
      web: {},
    },
  },
};

module.exports = {
  Audio,
  // Expose mock instances for test assertions
  __mockRecordingInstance: mockRecordingInstance,
  __mockSoundInstance: mockSoundInstance,
};
