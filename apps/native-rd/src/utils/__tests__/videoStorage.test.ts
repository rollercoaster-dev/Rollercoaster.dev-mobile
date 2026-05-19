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
    File: jest.fn().mockImplementation(() => ({
      uri: mockFileUri,
      copy: mockFileCopy,
      move: mockFileMove,
      get exists() {
        return mockFileExists();
      },
      delete: mockFileDelete,
    })),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockDirectoryExists.mockReturnValue(true);
  mockFileExists.mockReturnValue(true);
});

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
