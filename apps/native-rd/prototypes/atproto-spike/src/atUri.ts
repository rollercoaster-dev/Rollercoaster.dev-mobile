/**
 * Minimal AT-URI helpers. `@atproto/syntax` has an AtUri class, but the
 * parse is ten lines and keeping it here makes the record-resolution path
 * readable end to end without opening a dependency.
 *
 * at://<authority>/<collection>/<rkey>  — authority is a DID or a handle.
 */
export interface ParsedAtUri {
  authority: string;
  collection: string;
  rkey: string;
}

export function parseAtUri(uri: string): ParsedAtUri {
  const match = /^at:\/\/([^/]+)\/([^/]+)\/([^/?#]+)$/.exec(uri);
  if (!match) {
    throw new Error(`Not a record AT-URI (at://authority/collection/rkey): ${uri}`);
  }
  const [, authority, collection, rkey] = match;
  return { authority: authority!, collection: collection!, rkey: rkey! };
}

export function buildAtUri(p: ParsedAtUri): string {
  return `at://${p.authority}/${p.collection}/${p.rkey}`;
}
