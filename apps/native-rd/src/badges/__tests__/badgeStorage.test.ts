/**
 * Tests for badgeStorage — saveBadgePNG and supporting utilities.
 *
 * Mocks expo-file-system/legacy so tests run in Node without native modules.
 */

import { Buffer } from "buffer";

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///data/user/0/app/files/",
  EncodingType: { Base64: "base64" },
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockFS = require("expo-file-system/legacy");

import { saveBadgePNG, readBadgePNG } from "../badgeStorage";

const MINIMAL_PNG = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3,
]);

beforeEach(() => {
  jest.clearAllMocks();
  mockFS.getInfoAsync.mockResolvedValue({ exists: true });
  mockFS.makeDirectoryAsync.mockResolvedValue(undefined);
  mockFS.writeAsStringAsync.mockResolvedValue(undefined);
});

describe("saveBadgePNG", () => {
  it("returns a URI ending in .png inside the badges directory", async () => {
    const uri = await saveBadgePNG(MINIMAL_PNG);
    expect(uri).toMatch(
      /^file:\/\/\/data\/user\/0\/app\/files\/badges\/.+\.png$/,
    );
  });

  it("writes base64-encoded PNG data", async () => {
    await saveBadgePNG(MINIMAL_PNG);

    expect(mockFS.writeAsStringAsync).toHaveBeenCalledWith(
      expect.stringContaining("/badges/"),
      expect.any(String),
      { encoding: "base64" },
    );

    const [, base64Written] = mockFS.writeAsStringAsync.mock.calls[0] as [
      string,
      string,
      unknown,
    ];
    // Decode and verify round-trip integrity
    const decoded = Buffer.from(base64Written, "base64");
    expect(Array.from(decoded)).toEqual(Array.from(MINIMAL_PNG));
  });

  describe("when the badges directory does not exist", () => {
    it("creates the directory before writing", async () => {
      // First call (dir check) → missing; second call (post-write file check) → present.
      mockFS.getInfoAsync
        .mockResolvedValueOnce({ exists: false })
        .mockResolvedValueOnce({ exists: true });

      await saveBadgePNG(MINIMAL_PNG);

      expect(mockFS.makeDirectoryAsync).toHaveBeenCalledWith(
        "file:///data/user/0/app/files/badges/",
        { intermediates: true },
      );
      expect(mockFS.writeAsStringAsync).toHaveBeenCalled();
    });
  });

  describe("post-write verification", () => {
    it("throws when writeAsStringAsync resolves but the file is not on disk", async () => {
      // Mirror the iOS sandbox / quota silent-failure mode: write resolves
      // cleanly but the file never lands. saveBadgePNG must surface this
      // instead of returning a URI that points to nothing.
      mockFS.getInfoAsync
        .mockResolvedValueOnce({ exists: true }) // dir present
        .mockResolvedValueOnce({ exists: false }); // post-write check fails

      await expect(saveBadgePNG(MINIMAL_PNG)).rejects.toThrow(
        /Badge PNG write completed but file is missing/,
      );
    });
  });

  describe("when the badges directory already exists", () => {
    it("skips makeDirectoryAsync", async () => {
      mockFS.getInfoAsync.mockResolvedValue({ exists: true });

      await saveBadgePNG(MINIMAL_PNG);

      expect(mockFS.makeDirectoryAsync).not.toHaveBeenCalled();
    });
  });

  describe("error enrichment", () => {
    it("throws with the target directory path when makeDirectoryAsync fails", async () => {
      mockFS.getInfoAsync.mockResolvedValue({ exists: false });
      mockFS.makeDirectoryAsync.mockRejectedValue(
        new Error("Permission denied"),
      );

      await expect(saveBadgePNG(MINIMAL_PNG)).rejects.toThrow(
        /Failed to create badges directory at file:.*badges.*Permission denied/,
      );
    });

    it("throws with the target file URI when writeAsStringAsync fails", async () => {
      mockFS.writeAsStringAsync.mockRejectedValue(
        new Error("No space left on device"),
      );

      await expect(saveBadgePNG(MINIMAL_PNG)).rejects.toThrow(
        /Failed to write badge PNG to file:.*\.png.*No space left on device/,
      );
    });
  });

  it("each call generates a unique URI", async () => {
    const uri1 = await saveBadgePNG(MINIMAL_PNG);
    // Small delay so timestamp component can differ
    await new Promise((resolve) => setTimeout(resolve, 2));
    const uri2 = await saveBadgePNG(MINIMAL_PNG);

    expect(uri1).not.toBe(uri2);
  });
});

describe("readBadgePNG", () => {
  const URI = "file:///data/user/0/app/files/badges/abc-123.png";

  it("returns a Buffer of the file's bytes when the file exists", async () => {
    const base64 = Buffer.from(MINIMAL_PNG).toString("base64");
    mockFS.getInfoAsync.mockResolvedValue({ exists: true });
    mockFS.readAsStringAsync.mockResolvedValue(base64);

    const buf = await readBadgePNG(URI);

    expect(Array.from(buf)).toEqual(Array.from(MINIMAL_PNG));
    expect(mockFS.readAsStringAsync).toHaveBeenCalledWith(URI, {
      encoding: "base64",
    });
  });

  it("throws when the file does not exist — no silent fallback", async () => {
    mockFS.getInfoAsync.mockResolvedValue({ exists: false });

    await expect(readBadgePNG(URI)).rejects.toThrow(/Badge PNG not found/);
    expect(mockFS.readAsStringAsync).not.toHaveBeenCalled();
  });
});
