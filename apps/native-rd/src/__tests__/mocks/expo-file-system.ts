/**
 * Mock for expo-file-system (and expo-file-system/legacy)
 *
 * Stubs native file system APIs that require device storage.
 * Both the default and /legacy entry points map here via moduleNameMapper.
 * All write/delete/info operations resolve successfully by default.
 */
export const cacheDirectory = "file:///cache/";
export const documentDirectory = "file:///documents/";

export const EncodingType = {
  UTF8: "utf8",
  Base64: "base64",
} as const;

export const writeAsStringAsync = jest.fn(
  (
    _fileUri: string,
    _contents: string,
    _options?: { encoding?: string },
  ): Promise<void> => Promise.resolve(),
);

export const deleteAsync = jest.fn(
  (_fileUri: string, _options?: { idempotent?: boolean }): Promise<void> =>
    Promise.resolve(),
);

export const getInfoAsync = jest.fn(
  (_fileUri: string): Promise<{ exists: boolean; isDirectory: boolean }> =>
    Promise.resolve({ exists: true, isDirectory: false }),
);

export const makeDirectoryAsync = jest.fn(
  (_fileUri: string, _options?: { intermediates?: boolean }): Promise<void> =>
    Promise.resolve(),
);
