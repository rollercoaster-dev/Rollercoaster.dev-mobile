/**
 * Pure EAS Metadata (store.config.json) merge logic for release-notes-split.
 *
 * Kept free of `import.meta` and filesystem access so jest can import it
 * directly — release-notes-split.ts owns reading store.config.base.json and
 * writing the merged store.config.json.
 */

export type StoreConfig = {
  configVersion?: number;
  apple?: {
    info?: Record<string, Record<string, unknown> | undefined>;
  };
};

/**
 * Deep-clones `base` and injects `appstoreReleaseNotes` into
 * apple.info["en-US"].releaseNotes, leaving every other field intact. The
 * clone is defensive: callers pass the parsed store.config.base.json and must
 * not see it mutated.
 */
export function mergeStoreConfig(
  base: unknown,
  appstoreReleaseNotes: string,
): StoreConfig {
  const cloned = JSON.parse(JSON.stringify(base ?? {})) as StoreConfig;
  cloned.apple ??= {};
  cloned.apple.info ??= {};
  const locale = cloned.apple.info["en-US"] ?? {};
  cloned.apple.info["en-US"] = {
    ...locale,
    releaseNotes: appstoreReleaseNotes,
  };
  return cloned;
}
