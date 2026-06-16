import { File, Directory, Paths } from "expo-file-system";

const VIDEOS_SUBDIR = "evidence/videos";

function getVideosDirectory(): Directory {
  return new Directory(Paths.document, VIDEOS_SUBDIR);
}

export function getVideoStoragePath(): string {
  return getVideosDirectory().uri;
}

function extractExtension(uri: string): string {
  // Strip the directory portion, then take everything from the last "." onward.
  // Default to .mp4 if the source has no extension — iOS cameras and library
  // picks are typically .mov, Android is .mp4, but some sources omit it.
  const lastSlash = uri.lastIndexOf("/");
  const tail = lastSlash >= 0 ? uri.slice(lastSlash + 1) : uri;
  const dotIndex = tail.lastIndexOf(".");
  if (dotIndex < 0) return ".mp4";
  return tail.slice(dotIndex).toLowerCase();
}

function generateFilename(sourceUri: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}${extractExtension(sourceUri)}`;
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
  const destination = new File(videosDir, generateFilename(sourceUri));
  source.moveSync(destination);
  return destination.uri;
}

/** Copy a picked video (may live in an OS-owned cache) into persistent storage. */
export function copyVideoToAppStorage(sourceUri: string): string {
  const videosDir = ensureVideosDir();
  const source = new File(sourceUri);
  const destination = new File(videosDir, generateFilename(sourceUri));
  source.copySync(destination);
  return destination.uri;
}

export function deleteVideo(uri: string): void {
  const file = new File(uri);
  if (file.exists) {
    file.delete();
  }
}
