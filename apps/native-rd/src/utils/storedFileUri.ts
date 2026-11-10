/**
 * Stored file references for evidence media and baked badge PNGs.
 *
 * iOS puts the app's data container under a UUID path
 * (`…/Containers/Data/Application/<UUID>/Documents/`) that changes on device
 * restore/migration and can change on app update. An absolute `file://` URI
 * persisted in Evolu therefore goes stale even though the file itself is still
 * in Documents.
 *
 * - **Write side** (`toStoredFileUri`): a URI inside the current document
 *   directory is stored as `appdoc:<path relative to Documents>`.
 * - **Read side** (`resolveStoredFileUri`): `appdoc:` values, and absolute
 *   URIs written by builds up to v0.1.19, are rebased onto the *current*
 *   document (or cache) directory. Rows are never rewritten — Evolu is a CRDT
 *   store and the schema is unchanged, so resolution is purely read-time.
 *
 * Anything else (text notes, links, `pending:` placeholders, foreign URIs)
 * passes through untouched.
 */
import { File } from "expo-file-system";
import { cacheDirectory, documentDirectory } from "expo-file-system/legacy";

/** Prefix for a file stored relative to the app's Documents directory. */
export const APP_DOCUMENT_URI_PREFIX = "appdoc:";

// iOS device and simulator: `…/Containers/Data/Application/<UUID>/Documents/x`
// or `…/Library/Caches/x` (expo-audio recorded voice memos there before the
// recordings moved into Documents).
const IOS_CONTAINER_PATH =
  /\/Containers\/Data\/Application\/[^/]+\/(Documents|Library\/Caches)\/(.+)$/;

// Android: `…/<package>/files/` is the document directory. `files` is too
// generic a segment to rebase blindly, so only the app-managed roots qualify.
const ANDROID_DOCUMENT_PATH = /\/files\/((?:evidence|badges)\/.+)$/;

function withTrailingSlash(dir: string): string {
  return dir.endsWith("/") ? dir : `${dir}/`;
}

function currentDocumentDirectory(): string | null {
  return documentDirectory ? withTrailingSlash(documentDirectory) : null;
}

function currentCacheDirectory(): string | null {
  return cacheDirectory ? withTrailingSlash(cacheDirectory) : null;
}

/**
 * Resolve a stored URI to an absolute URI valid in the current app container.
 * Idempotent: resolving an already-current absolute URI returns it unchanged.
 */
export function resolveStoredFileUri(stored: string): string {
  if (typeof stored !== "string") return stored;
  if (stored.startsWith(APP_DOCUMENT_URI_PREFIX)) {
    const docDir = currentDocumentDirectory();
    if (!docDir) return stored;
    return `${docDir}${stored.slice(APP_DOCUMENT_URI_PREFIX.length)}`;
  }

  if (!stored.startsWith("file://")) return stored;

  const ios = IOS_CONTAINER_PATH.exec(stored);
  if (ios) {
    const base =
      ios[1] === "Documents"
        ? currentDocumentDirectory()
        : currentCacheDirectory();
    return base ? `${base}${ios[2]}` : stored;
  }

  const android = ANDROID_DOCUMENT_PATH.exec(stored);
  if (android) {
    const docDir = currentDocumentDirectory();
    return docDir ? `${docDir}${android[1]}` : stored;
  }

  return stored;
}

/**
 * Convert a URI into the form persisted in the database. Files inside the
 * app's Documents directory (including stale-container URIs) become
 * `appdoc:<relative path>`; everything else is returned unchanged.
 */
export function toStoredFileUri(uri: string): string {
  // Untyped callers may pass nothing; leave validation to the caller.
  if (typeof uri !== "string" || uri.length === 0) return uri;
  const docDir = currentDocumentDirectory();
  if (!docDir) return uri;
  const absolute = resolveStoredFileUri(uri);
  if (!absolute.startsWith(docDir)) return uri;
  const relative = absolute.slice(docDir.length);
  return relative ? `${APP_DOCUMENT_URI_PREFIX}${relative}` : uri;
}

/**
 * Whether the file a stored URI points to is present on disk. Errs towards
 * `true` when the check itself fails, so a broken probe never hides media
 * that may well be there.
 */
export function storedFileExists(stored: string): boolean {
  if (!stored) return false;
  try {
    return new File(resolveStoredFileUri(stored)).exists;
  } catch {
    return true;
  }
}
