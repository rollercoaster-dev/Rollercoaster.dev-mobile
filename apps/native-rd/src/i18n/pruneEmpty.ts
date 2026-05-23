// Recursive prune for JSON parsed from `tolgee pull` output: drops empty
// strings, then empty objects/arrays that result from that drop. Used by
// scripts/tolgee-prune-empty.ts to keep `resources/de/*.json` from carrying
// `""` leaves that would resolve as literal "" instead of falling back to en.
//
// Returns `undefined` when the entire value should be dropped (e.g. an object
// whose every child got pruned). Callers should treat `undefined` as "delete
// this branch".

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export function pruneEmpty(value: unknown): JsonValue | undefined {
  if (typeof value === "string") {
    return value === "" ? undefined : value;
  }
  if (Array.isArray(value)) {
    const pruned = value
      .map(pruneEmpty)
      .filter((v): v is JsonValue => v !== undefined);
    return pruned.length === 0 ? undefined : pruned;
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, JsonValue> = {};
    for (const [key, child] of Object.entries(value)) {
      const prunedChild = pruneEmpty(child);
      if (prunedChild !== undefined) {
        result[key] = prunedChild;
      }
    }
    return Object.keys(result).length === 0 ? undefined : result;
  }
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return undefined;
}
