import { File, Directory, Paths } from "expo-file-system";

const VIDEOS_SUBDIR = "evidence/videos";

function getVideosDirectory(): Directory {
  return new Directory(Paths.document, VIDEOS_SUBDIR);
}

export function getVideoStoragePath(): string {
  return getVideosDirectory().uri;
}

function generateFilename(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}.mp4`;
}

function ensureVideosDir(): Directory {
  const dir = getVideosDirectory();
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

/** Move a recorded video (lives in app temp dir) into persistent storage. */
export function moveVideoToAppStorage(sourceUri: string): string {
  const videosDir = ensureVideosDir();
  const source = new File(sourceUri);
  const destination = new File(videosDir, generateFilename());
  source.move(destination);
  return destination.uri;
}

/** Copy a picked video (may live in an OS-owned cache) into persistent storage. */
export function copyVideoToAppStorage(sourceUri: string): string {
  const videosDir = ensureVideosDir();
  const source = new File(sourceUri);
  const destination = new File(videosDir, generateFilename());
  source.copy(destination);
  return destination.uri;
}

export function deleteVideo(uri: string): void {
  const file = new File(uri);
  if (file.exists) {
    file.delete();
  }
}
