import { File, Directory, Paths } from 'expo-file-system';

const PHOTOS_SUBDIR = 'evidence/photos';

function getPhotosDirectory(): Directory {
  return new Directory(Paths.document, PHOTOS_SUBDIR);
}

export function getPhotoStoragePath(): string {
  return getPhotosDirectory().uri;
}

function generateFilename(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}.jpg`;
}

export function saveImageToAppStorage(sourceUri: string): string {
  const photosDir = getPhotosDirectory();
  if (!photosDir.exists) {
    photosDir.create({ intermediates: true });
  }

  const filename = generateFilename();
  const source = new File(sourceUri);
  const destination = new File(photosDir, filename);
  source.copy(destination);
  return destination.uri;
}

export function deleteImage(uri: string): void {
  const file = new File(uri);
  if (file.exists) {
    file.delete();
  }
}
