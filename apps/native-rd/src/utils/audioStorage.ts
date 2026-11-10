import { File, Directory, Paths } from "expo-file-system";
import { Logger } from "../shims/rd-logger";
import { resolveStoredFileUri } from "./storedFileUri";

const logger = new Logger("audioStorage");

const AUDIO_SUBDIR = "evidence/audio";

function getAudioDirectory(): Directory {
  return new Directory(Paths.document, AUDIO_SUBDIR);
}

function extractExtension(uri: string): string {
  // expo-audio's HIGH_QUALITY preset records .m4a; default to that when the
  // recorder URI has no extension.
  const lastSlash = uri.lastIndexOf("/");
  const tail = lastSlash >= 0 ? uri.slice(lastSlash + 1) : uri;
  const dotIndex = tail.lastIndexOf(".");
  if (dotIndex < 0) return ".m4a";
  return tail.slice(dotIndex).toLowerCase();
}

function generateFilename(sourceUri: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}${extractExtension(sourceUri)}`;
}

/**
 * Copy a finished recording into persistent evidence storage.
 *
 * expo-audio records into `Caches/ExpoAudio/`, which iOS may purge and does
 * not back up, so the recorder's own URI must never be persisted. Copy (not
 * move) so the screen's preview player keeps its source if saving fails.
 */
export function copyAudioToAppStorage(sourceUri: string): string {
  if (!sourceUri) throw new Error("copyAudioToAppStorage: missing source URI");
  const dir = getAudioDirectory();
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  const source = new File(sourceUri);
  const destination = new File(dir, generateFilename(sourceUri));
  source.copySync(destination);
  return destination.uri;
}

/**
 * Best-effort delete of a recording (temp file or stored copy). Never throws:
 * a failed cleanup must not turn a successful save into an error.
 */
export function deleteAudio(uri: string): void {
  if (!uri) return;
  try {
    const file = new File(resolveStoredFileUri(uri));
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    logger.warn("Failed to delete audio file", { error });
  }
}
