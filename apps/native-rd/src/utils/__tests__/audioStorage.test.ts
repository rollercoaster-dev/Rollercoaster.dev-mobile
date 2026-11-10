import { copyAudioToAppStorage, deleteAudio } from "../audioStorage";

const mockDirectoryExists = jest.fn(() => true);
const mockDirectoryCreate = jest.fn();
const mockFileCopySync = jest.fn();
const mockFileMoveSync = jest.fn();
const mockFileExists = jest.fn(() => true);
const mockFileDelete = jest.fn();
const mockDestUri = "file:///documents/evidence/audio/saved.m4a";

const fileConstructorCalls: unknown[][] = [];
const directoryConstructorCalls: unknown[][] = [];

// `expo-file-system` and `/legacy` share one mock file in jest.config, so
// this factory also supplies the documentDirectory the resolver reads.
jest.mock("expo-file-system", () => ({
  documentDirectory: "file:///documents/",
  cacheDirectory: "file:///caches/",
  Paths: { document: { uri: "file:///documents/" } },
  Directory: jest.fn().mockImplementation((...args: unknown[]) => {
    directoryConstructorCalls.push(args);
    return {
      get exists() {
        return mockDirectoryExists();
      },
      create: mockDirectoryCreate,
    };
  }),
  File: jest.fn().mockImplementation((...args: unknown[]) => {
    fileConstructorCalls.push(args);
    return {
      uri: mockDestUri,
      copySync: mockFileCopySync,
      moveSync: mockFileMoveSync,
      get exists() {
        return mockFileExists();
      },
      delete: mockFileDelete,
    };
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  fileConstructorCalls.length = 0;
  directoryConstructorCalls.length = 0;
  mockDirectoryExists.mockReturnValue(true);
  mockFileExists.mockReturnValue(true);
});

describe("copyAudioToAppStorage", () => {
  it("copies (not moves) the recording into Documents/evidence/audio", () => {
    const result = copyAudioToAppStorage(
      "file:///caches/ExpoAudio/recording-1.m4a",
    );

    expect(directoryConstructorCalls[0]?.[1]).toBe("evidence/audio");
    expect(fileConstructorCalls[0]).toEqual([
      "file:///caches/ExpoAudio/recording-1.m4a",
    ]);
    expect(mockFileCopySync).toHaveBeenCalledTimes(1);
    expect(mockFileMoveSync).not.toHaveBeenCalled();
    expect(result).toBe(mockDestUri);
  });

  it("creates the audio directory when missing", () => {
    mockDirectoryExists.mockReturnValue(false);
    copyAudioToAppStorage("file:///caches/ExpoAudio/r.m4a");
    expect(mockDirectoryCreate).toHaveBeenCalledWith({ intermediates: true });
  });

  it.each([
    ["file:///caches/ExpoAudio/r.M4A", /\.m4a$/],
    ["file:///caches/ExpoAudio/r.caf", /\.caf$/],
    ["file:///caches/ExpoAudio/noext", /\.m4a$/],
  ])("names the copy of %s with extension %s", (source, ext) => {
    copyAudioToAppStorage(source);
    expect(fileConstructorCalls[1]?.[1]).toMatch(ext);
  });
});

describe("deleteAudio", () => {
  it("deletes the file a stored appdoc: URI resolves to", () => {
    deleteAudio("appdoc:evidence/audio/r.m4a");
    expect(fileConstructorCalls[0]).toEqual([
      "file:///documents/evidence/audio/r.m4a",
    ]);
    expect(mockFileDelete).toHaveBeenCalledTimes(1);
  });

  it("swallows a delete failure so cleanup never fails a save", () => {
    mockFileDelete.mockImplementationOnce(() => {
      throw new Error("EPERM");
    });
    expect(() => deleteAudio("appdoc:evidence/audio/r.m4a")).not.toThrow();
  });

  it("skips deletion when the file is already gone", () => {
    mockFileExists.mockReturnValue(false);
    deleteAudio("file:///caches/ExpoAudio/r.m4a");
    expect(mockFileDelete).not.toHaveBeenCalled();
  });
});
