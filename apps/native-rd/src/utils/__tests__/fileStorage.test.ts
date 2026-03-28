import {
  saveFileToAppStorage,
  deleteFile,
  getFileStoragePath,
  validateFile,
  MAX_FILE_SIZE_BYTES,
} from '../fileStorage';

const mockDirectoryExists = jest.fn(() => true);
const mockDirectoryCreate = jest.fn();
const mockFileCopy = jest.fn();
const mockFileExists = jest.fn(() => true);
const mockFileDelete = jest.fn();
const mockDirUri = 'file:///data/documents/evidence/files/';
const mockFileUri = 'file:///data/documents/evidence/files/test.pdf';

jest.mock('expo-file-system', () => {
  return {
    Paths: {
      get document() {
        return { uri: 'file:///data/documents/' };
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

describe('getFileStoragePath', () => {
  it('returns the files directory URI', () => {
    const path = getFileStoragePath();
    expect(path).toBe(mockDirUri);
  });
});

describe('validateFile', () => {
  it('returns null for valid PDF file', () => {
    expect(validateFile('application/pdf', 1024)).toBeNull();
  });

  it('returns null for valid image file', () => {
    expect(validateFile('image/jpeg', 2048)).toBeNull();
  });

  it('returns null for valid document file', () => {
    expect(
      validateFile(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        5000,
      ),
    ).toBeNull();
  });

  it('returns error when file exceeds max size', () => {
    const result = validateFile('application/pdf', MAX_FILE_SIZE_BYTES + 1);
    expect(result).toContain('too large');
  });

  it('returns null when size is exactly max', () => {
    expect(validateFile('application/pdf', MAX_FILE_SIZE_BYTES)).toBeNull();
  });

  it('returns error for unsupported MIME type', () => {
    const result = validateFile('application/zip', 1024);
    expect(result).toContain('not supported');
  });

  it('returns null when mimeType is null (allows unknown)', () => {
    expect(validateFile(null, 1024)).toBeNull();
  });

  it('returns null when mimeType is undefined (allows unknown)', () => {
    expect(validateFile(undefined, 1024)).toBeNull();
  });

  it('returns null when size is null (unknown size)', () => {
    expect(validateFile('application/pdf', null)).toBeNull();
  });

  it('returns null when size is undefined (unknown size)', () => {
    expect(validateFile('application/pdf', undefined)).toBeNull();
  });
});

describe('saveFileToAppStorage', () => {
  it('creates directory if it does not exist', () => {
    mockDirectoryExists.mockReturnValue(false);

    saveFileToAppStorage('file:///tmp/doc.pdf', 'doc.pdf');

    expect(mockDirectoryCreate).toHaveBeenCalledWith({ intermediates: true });
  });

  it('does not create directory if it already exists', () => {
    mockDirectoryExists.mockReturnValue(true);

    saveFileToAppStorage('file:///tmp/doc.pdf', 'doc.pdf');

    expect(mockDirectoryCreate).not.toHaveBeenCalled();
  });

  it('copies the source file', () => {
    saveFileToAppStorage('file:///tmp/doc.pdf', 'doc.pdf');

    expect(mockFileCopy).toHaveBeenCalled();
  });

  it('returns a file URI', () => {
    const result = saveFileToAppStorage('file:///tmp/doc.pdf', 'doc.pdf');

    expect(typeof result).toBe('string');
    expect(result).toContain('file://');
  });
});

describe('deleteFile', () => {
  it('deletes the file if it exists', () => {
    mockFileExists.mockReturnValue(true);

    deleteFile('file:///data/evidence/files/abc.pdf');

    expect(mockFileDelete).toHaveBeenCalled();
  });

  it('does not delete if file does not exist', () => {
    mockFileExists.mockReturnValue(false);

    deleteFile('file:///data/evidence/files/abc.pdf');

    expect(mockFileDelete).not.toHaveBeenCalled();
  });
});
