/**
 * Badge filename helpers.
 *
 * Saved/exported badge files are named after the goal they represent so the
 * user recognises them in the share sheet, Files app, or download folder —
 * instead of an opaque `{timestamp}-{random}.png`.
 */

const FALLBACK_SLUG = "badge";
const MAX_SLUG_LENGTH = 40;

/**
 * Turn a badge/goal title into a filesystem- and share-sheet-safe slug.
 *
 * - Replaces runs of characters outside `[a-zA-Z0-9-_]` with a single dash
 *   (so non-Latin scripts, emoji, and punctuation can't produce invalid
 *   filenames).
 * - Collapses runs of dashes and trims leading/trailing dashes. Underscores
 *   are valid filename characters and are kept as-is.
 * - Caps length so the full filename (slug + suffix + extension) stays short.
 * - Falls back to `"badge"` when nothing usable remains (e.g. emoji-only title).
 */
export function slugifyBadgeName(name: string | null | undefined): string {
  const slug = (name ?? "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");

  return slug || FALLBACK_SLUG;
}
