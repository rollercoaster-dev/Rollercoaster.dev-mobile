import {
  moveVideoToAppStorage,
  copyVideoToAppStorage,
  deleteVideo,
  getVideoStoragePath,
} from "../videoStorage";

const mockDirectoryExists = jest.fn(() => true);
const mockDirectoryCreate = jest.fn();
const mockFileCopy = jest.fn();
const mockFileMove = jest.fn();
const mockFileExists = jest.fn(() => true);
const mockFileDelete = jest.fn();
const mockDirUri = "file:///data/documents/evidence/videos/";
const mockFileUri = "file:///data/documents/evidence/videos/test.mp4";

// Captures the second argument passed to `new File(dir, filename)` so tests
// can assert how the destination filename (and its extension) is derived.
const fileConstructorCalls: { args: unknown[] }[] = [];

jest.mock("expo-file-system", () => {
  return {
    Paths: {
      get document() {
        return { uri: "file:///data/documents/" };
      },
    },
    Directory: jest.fn().mockImplementation(() => ({
      uri: mockDirUri,
      get exists() {
        return mockDirectoryExists();
      },
      create: mockDirectoryCreate,
    })),
    File: jest.fn().mockImplementation((...args: unknown[]) => {
      fileConstructorCalls.push({ args });
      return {
        uri: mockFileUri,
        copy: mockFileCopy,
        move: mockFileMove,
        get exists() {
          return mockFileExists();
        },
        delete: mockFileDelete,
      };
    }),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  fileConstructorCalls.length = 0;
  mockDirectoryExists.mockReturnValue(true);
  mockFileExists.mockReturnValue(true);
});

// Reads the destination filename out of the captured constructor args.
// The util calls `new File(sourceUri)` then `new File(videosDir, filename)`,
// so the second invocation's second arg is the destination filename.
function getDestinationFilename(): string {
  const destCall = fileConstructorCalls[1];
  expect(destCall).toBeDefined();
  return destCall.args[1] as string;
}

describe("getVideoStoragePath", () => {
  it("returns the videos directory URI", () => {
    expect(getVideoStoragePath()).toBe(mockDirUri);
  });
});

describe("moveVideoToAppStorage", () => {
  it("creates directory if it does not exist", () => {
    mockDirectoryExists.mockReturnValue(false);

    moveVideoToAppStorage("file:///tmp/video.mp4");

    expect(mockDirectoryCreate).toHaveBeenCalledWith({ intermediates: true });
  });

  it("does not create directory if it already exists", () => {
    mockDirectoryExists.mockReturnValue(true);

    moveVideoToAppStorage("file:///tmp/video.mp4");

    expect(mockDirectoryCreate).not.toHaveBeenCalled();
  });

  it("moves the source file", () => {
    moveVideoToAppStorage("file:///tmp/video.mp4");

    expect(mockFileMove).toHaveBeenCalled();
    expect(mockFileCopy).not.toHaveBeenCalled();
  });

  it("returns a file URI", () => {
    const result = moveVideoToAppStorage("file:///tmp/video.mp4");

    expect(typeof result).toBe("string");
    expect(result).toContain("file://");
  });
});

describe("copyVideoToAppStorage", () => {
  it("creates directory if it does not exist", () => {
    mockDirectoryExists.mockReturnValue(false);

    copyVideoToAppStorage("file:///library/video.mp4");

    expect(mockDirectoryCreate).toHaveBeenCalledWith({ intermediates: true });
  });

  it("copies the source file", () => {
    copyVideoToAppStorage("file:///library/video.mp4");

    expect(mockFileCopy).toHaveBeenCalled();
    expect(mockFileMove).not.toHaveBeenCalled();
  });

  it("returns a file URI", () => {
    const result = copyVideoToAppStorage("file:///library/video.mp4");

    expect(typeof result).toBe("string");
    expect(result).toContain("file://");
  });
});

describe("destination filename extension", () => {
  it("preserves .mp4 from the source URI", () => {
    moveVideoToAppStorage("file:///tmp/clip.mp4");
    expect(getDestinationFilename()).toMatch(/\.mp4$/);
  });

  it("preserves .mov from the source URI (iOS camera default)", () => {
    moveVideoToAppStorage("file:///tmp/recording.mov");
    expect(getDestinationFilename()).toMatch(/\.mov$/);
  });

  it("preserves .mov from a library pick", () => {
    copyVideoToAppStorage("file:///var/mobile/library/IMG_1234.mov");
    expect(getDestinationFilename()).toMatch(/\.mov$/);
  });

  it("lowercases the extension", () => {
    moveVideoToAppStorage("file:///tmp/CLIP.MP4");
    expect(getDestinationFilename()).toMatch(/\.mp4$/);
  });

  it("falls back to .mp4 when the source has no extension", () => {
    moveVideoToAppStorage("file:///tmp/recording");
    expect(getDestinationFilename()).toMatch(/\.mp4$/);
  });
});

describe("deleteVideo", () => {
  it("deletes the file if it exists", () => {
    mockFileExists.mockReturnValue(true);

    deleteVideo("file:///data/evidence/videos/abc.mp4");

    expect(mockFileDelete).toHaveBeenCalled();
  });

  it("does not delete if file does not exist", () => {
    mockFileExists.mockReturnValue(false);

    deleteVideo("file:///data/evidence/videos/abc.mp4");

    expect(mockFileDelete).not.toHaveBeenCalled();
  });
});
