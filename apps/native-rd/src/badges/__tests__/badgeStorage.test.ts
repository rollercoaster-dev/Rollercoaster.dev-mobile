/**
 * Tests for badgeStorage — saveBadgePNG and supporting utilities.
 *
 * Mocks expo-file-system/legacy so tests run in Node without native modules.
 */

import { Buffer } from 'buffer';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///data/user/0/app/files/',
  EncodingType: { Base64: 'base64' },
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockFS = require('expo-file-system/legacy');

import { saveBadgePNG } from '../badgeStorage';

const MINIMAL_PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3]);

beforeEach(() => {
  jest.clearAllMocks();
  mockFS.getInfoAsync.mockResolvedValue({ exists: true });
  mockFS.makeDirectoryAsync.mockResolvedValue(undefined);
  mockFS.writeAsStringAsync.mockResolvedValue(undefined);
});

describe('saveBadgePNG', () => {
  it('returns a URI ending in .png inside the badges directory', async () => {
    const uri = await saveBadgePNG(MINIMAL_PNG);
    expect(uri).toMatch(/^file:\/\/\/data\/user\/0\/app\/files\/badges\/.+\.png$/);
  });

  it('writes base64-encoded PNG data', async () => {
    await saveBadgePNG(MINIMAL_PNG);

    expect(mockFS.writeAsStringAsync).toHaveBeenCalledWith(
      expect.stringContaining('/badges/'),
      expect.any(String),
      { encoding: 'base64' },
    );

    const [, base64Written] = mockFS.writeAsStringAsync.mock.calls[0] as [string, string, unknown];
    // Decode and verify round-trip integrity
    const decoded = Buffer.from(base64Written, 'base64');
    expect(Array.from(decoded)).toEqual(Array.from(MINIMAL_PNG));
  });

  describe('when the badges directory does not exist', () => {
    it('creates the directory before writing', async () => {
      mockFS.getInfoAsync.mockResolvedValue({ exists: false });

      await saveBadgePNG(MINIMAL_PNG);

      expect(mockFS.makeDirectoryAsync).toHaveBeenCalledWith(
        'file:///data/user/0/app/files/badges/',
        { intermediates: true },
      );
      expect(mockFS.writeAsStringAsync).toHaveBeenCalled();
    });
  });

  describe('when the badges directory already exists', () => {
    it('skips makeDirectoryAsync', async () => {
      mockFS.getInfoAsync.mockResolvedValue({ exists: true });

      await saveBadgePNG(MINIMAL_PNG);

      expect(mockFS.makeDirectoryAsync).not.toHaveBeenCalled();
    });
  });

  describe('error enrichment', () => {
    it('throws with the target directory path when makeDirectoryAsync fails', async () => {
      mockFS.getInfoAsync.mockResolvedValue({ exists: false });
      mockFS.makeDirectoryAsync.mockRejectedValue(new Error('Permission denied'));

      await expect(saveBadgePNG(MINIMAL_PNG)).rejects.toThrow(
        /Failed to create badges directory at file:.*badges.*Permission denied/,
      );
    });

    it('throws with the target file URI when writeAsStringAsync fails', async () => {
      mockFS.writeAsStringAsync.mockRejectedValue(new Error('No space left on device'));

      await expect(saveBadgePNG(MINIMAL_PNG)).rejects.toThrow(
        /Failed to write badge PNG to file:.*\.png.*No space left on device/,
      );
    });
  });

  it('each call generates a unique URI', async () => {
    const uri1 = await saveBadgePNG(MINIMAL_PNG);
    // Small delay so timestamp component can differ
    await new Promise((resolve) => setTimeout(resolve, 2));
    const uri2 = await saveBadgePNG(MINIMAL_PNG);

    expect(uri1).not.toBe(uri2);
  });
});
