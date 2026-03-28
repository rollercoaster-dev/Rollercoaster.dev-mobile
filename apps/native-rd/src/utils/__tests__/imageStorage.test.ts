import { saveImageToAppStorage, deleteImage, getPhotoStoragePath } from '../imageStorage';

const mockDirectoryExists = jest.fn(() => true);
const mockDirectoryCreate = jest.fn();
const mockFileCopy = jest.fn();
const mockFileExists = jest.fn(() => true);
const mockFileDelete = jest.fn();
const mockDirUri = 'file:///data/documents/evidence/photos/';
const mockFileUri = 'file:///data/documents/evidence/photos/test.jpg';

jest.mock('expo-file-system', () => {
  return {
    Paths: {
      get document() {
        return { uri: 'file:///data/documents/' };
      },
    },
    Directory: jest.fn().mockImplementation(() => ({
      uri: mockDirUri,
      get exists() { return mockDirectoryExists(); },
      create: mockDirectoryCreate,
    })),
    File: jest.fn().mockImplementation(() => ({
      uri: mockFileUri,
      copy: mockFileCopy,
      get exists() { return mockFileExists(); },
      delete: mockFileDelete,
    })),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockDirectoryExists.mockReturnValue(true);
  mockFileExists.mockReturnValue(true);
});

describe('getPhotoStoragePath', () => {
  it('returns the photos directory URI', () => {
    const path = getPhotoStoragePath();
    expect(path).toBe(mockDirUri);
  });
});

describe('saveImageToAppStorage', () => {
  it('creates directory if it does not exist', () => {
    mockDirectoryExists.mockReturnValue(false);

    saveImageToAppStorage('file:///tmp/photo.jpg');

    expect(mockDirectoryCreate).toHaveBeenCalledWith({ intermediates: true });
  });

  it('does not create directory if it already exists', () => {
    mockDirectoryExists.mockReturnValue(true);

    saveImageToAppStorage('file:///tmp/photo.jpg');

    expect(mockDirectoryCreate).not.toHaveBeenCalled();
  });

  it('copies the source file', () => {
    saveImageToAppStorage('file:///tmp/photo.jpg');

    expect(mockFileCopy).toHaveBeenCalled();
  });

  it('returns a file URI', () => {
    const result = saveImageToAppStorage('file:///tmp/photo.jpg');

    expect(typeof result).toBe('string');
    expect(result).toContain('file://');
  });
});

describe('deleteImage', () => {
  it('deletes the file if it exists', () => {
    mockFileExists.mockReturnValue(true);

    deleteImage('file:///data/evidence/photos/abc.jpg');

    expect(mockFileDelete).toHaveBeenCalled();
  });

  it('does not delete if file does not exist', () => {
    mockFileExists.mockReturnValue(false);

    deleteImage('file:///data/evidence/photos/abc.jpg');

    expect(mockFileDelete).not.toHaveBeenCalled();
  });
});
