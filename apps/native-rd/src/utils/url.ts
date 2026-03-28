/**
 * URL validation utilities for evidence capture
 */

/**
 * Validates whether a string is a well-formed HTTP or HTTPS URL.
 *
 * Accepts URLs with or without protocol prefix:
 * - "https://example.com" -> valid
 * - "http://example.com" -> valid
 * - "example.com" -> invalid (protocol required)
 * - "ftp://example.com" -> invalid (only http/https)
 *
 * @param input - The string to validate
 * @returns true if the string is a valid http/https URL
 */
export function isValidUrl(input: string): boolean {
  if (!input || typeof input !== 'string') return false;

  const trimmed = input.trim();
  if (trimmed.length === 0) return false;

  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalizes a URL string by trimming whitespace.
 * Does not add protocol - the user must provide a full URL.
 *
 * @param input - The URL string to normalize
 * @returns Trimmed URL string
 */
export function normalizeUrl(input: string): string {
  return input.trim();
}
