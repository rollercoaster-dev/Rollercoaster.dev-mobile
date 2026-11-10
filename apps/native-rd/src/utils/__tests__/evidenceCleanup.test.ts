import { deleteEvidenceFile } from "../evidenceCleanup";

const mockFileExists = jest.fn(() => true);
const mockFileDelete = jest.fn();

jest.mock("expo-file-system", () => ({
  // Shared with expo-file-system/legacy (jest.config) — read by storedFileUri.
  documentDirectory: "file:///data/documents/",
  File: jest.fn().mockImplementation(() => ({
    get exists() {
      return mockFileExists();
    },
    delete: mockFileDelete,
  })),
}));

jest.mock("../../shims/rd-logger", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe("deleteEvidenceFile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileExists.mockReturnValue(true);
  });

  it("deletes file for photo evidence", () => {
    deleteEvidenceFile("/photo.jpg", "photo");
    expect(mockFileDelete).toHaveBeenCalled();
  });

  it("deletes file for video evidence", () => {
    deleteEvidenceFile("/video.mp4", "video");
    expect(mockFileDelete).toHaveBeenCalled();
  });

  it("deletes file for voice_memo evidence", () => {
    deleteEvidenceFile("/audio.m4a", "voice_memo");
    expect(mockFileDelete).toHaveBeenCalled();
  });

  it("deletes file for file evidence", () => {
    deleteEvidenceFile("/doc.pdf", "file");
    expect(mockFileDelete).toHaveBeenCalled();
  });

  it("skips deletion for text evidence", () => {
    deleteEvidenceFile("content:text;My notes", "text");
    expect(mockFileDelete).not.toHaveBeenCalled();
  });

  it("skips deletion for link evidence", () => {
    deleteEvidenceFile("https://example.com", "link");
    expect(mockFileDelete).not.toHaveBeenCalled();
  });

  it("skips deletion when uri is undefined", () => {
    deleteEvidenceFile(undefined, "photo");
    expect(mockFileDelete).not.toHaveBeenCalled();
  });

  it("skips deletion when file does not exist on disk", () => {
    mockFileExists.mockReturnValue(false);
    deleteEvidenceFile("/missing.jpg", "photo");
    expect(mockFileDelete).not.toHaveBeenCalled();
  });

  it("does not throw when file deletion fails", () => {
    mockFileDelete.mockImplementation(() => {
      throw new Error("Permission denied");
    });
    expect(() => deleteEvidenceFile("/photo.jpg", "photo")).not.toThrow();
  });
});

describe("deleteEvidenceFile with a stored URI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileExists.mockReturnValue(true);
  });

  it.each([
    ["relative appdoc:", "appdoc:evidence/audio/r.m4a"],
    [
      "stale iOS container",
      "file:///var/mobile/Containers/Data/Application/OLD/Documents/evidence/audio/r.m4a",
    ],
  ])("deletes the %s file in the current Documents dir", (_kind, stored) => {
    const { File } = jest.requireMock("expo-file-system");
    deleteEvidenceFile(stored, "voice_memo");
    expect(File).toHaveBeenLastCalledWith(
      "file:///data/documents/evidence/audio/r.m4a",
    );
    expect(mockFileDelete).toHaveBeenCalledTimes(1);
  });
});
