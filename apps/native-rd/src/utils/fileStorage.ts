import { File, Directory, Paths } from "expo-file-system";

const FILES_SUBDIR = "evidence/files";

/** Maximum file size in bytes (50 MB) */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/** Human-readable max file size for display */
export const MAX_FILE_SIZE_LABEL = "50 MB";

/**
 * MIME types allowed for file attachment evidence.
 * Covers PDFs, images, and common document formats.
 */
export const ALLOWED_MIME_TYPES = [
  // PDF
  "application/pdf",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  // Documents
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "text/markdown",
];

function getFilesDirectory(): Directory {
  return new Directory(Paths.document, FILES_SUBDIR);
}

/** Get the URI of the files storage directory */
export function getFileStoragePath(): string {
  return getFilesDirectory().uri;
}

function generateFilename(originalName: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  // Preserve the original extension
  const dotIndex = originalName.lastIndexOf(".");
  const ext = dotIndex >= 0 ? originalName.slice(dotIndex) : "";
  return `${timestamp}-${random}${ext}`;
}

/**
 * Validate a file before saving.
 * @returns null if valid, or an error message string.
 */
export function validateFile(
  mimeType: string | null | undefined,
  size: number | null | undefined,
): string | null {
  if (size != null && size > MAX_FILE_SIZE_BYTES) {
    return `File is too large. Maximum size is ${MAX_FILE_SIZE_LABEL}.`;
  }

  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
    return "File type is not supported. Please choose a PDF, image, or document.";
  }

  return null;
}

/**
 * Copy a file from its source URI into the app's local evidence/files storage.
 * @param sourceUri - The source file URI (from document picker)
 * @param originalName - The original filename (for extension preservation)
 * @returns The destination file URI
 */
export function saveFileToAppStorage(
  sourceUri: string,
  originalName: string,
): string {
  const filesDir = getFilesDirectory();
  if (!filesDir.exists) {
    filesDir.create({ intermediates: true });
  }

  const filename = generateFilename(originalName);
  const source = new File(sourceUri);
  const destination = new File(filesDir, filename);
  source.copy(destination);
  return destination.uri;
}

/**
 * Delete a file from app storage.
 * @param uri - The file URI to delete
 */
export function deleteFile(uri: string): void {
  const file = new File(uri);
  if (file.exists) {
    file.delete();
  }
}
