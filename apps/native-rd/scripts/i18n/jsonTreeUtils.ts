const MISSING_TRANSLATION = "__rollercoasterMissingTranslation";

type JsonObject = { readonly [key: string]: JsonTree };

export type JsonTree = string | readonly JsonTree[] | JsonObject;

export type TranslationDict = Record<string, string>;
export type PathSegment = string | number;

export type MissingTranslation = {
  readonly [MISSING_TRANSLATION]: true;
  readonly source: string;
};

export type FilledJsonTree =
  | string
  | readonly FilledJsonTree[]
  | { readonly [key: string]: FilledJsonTree }
  | MissingTranslation;

export type TranslationPathMap = {
  readonly source: JsonTree;
  readonly paths: Readonly<Record<string, readonly PathSegment[]>>;
  readonly keys: readonly string[];
};

export type TranslatableSubtree = {
  readonly dict: TranslationDict;
  readonly pathMap: TranslationPathMap;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isMissingTranslation(value: unknown): value is MissingTranslation {
  return (
    isRecord(value) &&
    value[MISSING_TRANSLATION] === true &&
    typeof value.source === "string"
  );
}

function markMissing(source: string): MissingTranslation {
  return { [MISSING_TRANSLATION]: true, source };
}

function hasIndex(value: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(value, index);
}

function hasOwnKey(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function assertNoSparseArray(value: readonly unknown[], label: string): void {
  for (let index = 0; index < value.length; index += 1) {
    if (!hasIndex(value, index)) {
      throw new Error(`${label} contains a sparse array hole`);
    }
  }
}

function assertFilledJsonTree(
  value: unknown,
  label: string,
): asserts value is FilledJsonTree {
  if (typeof value === "string" || isMissingTranslation(value)) {
    return;
  }

  if (Array.isArray(value)) {
    assertNoSparseArray(value, label);
    value.forEach((child) => assertFilledJsonTree(child, label));
    return;
  }

  if (isRecord(value)) {
    Object.values(value).forEach((child) => assertFilledJsonTree(child, label));
    return;
  }

  throw new Error(`${label} contains a non-string leaf`);
}

function cloneJsonTree(source: JsonTree): JsonTree {
  if (typeof source === "string") {
    return source;
  }

  if (Array.isArray(source)) {
    assertNoSparseArray(source, "Source tree");
    return source.map(cloneJsonTree);
  }

  const result: Record<string, JsonTree> = {};

  for (const [key, child] of Object.entries(source)) {
    result[key] = cloneJsonTree(child);
  }

  return result;
}

function targetArrayForBranch(target: unknown): readonly unknown[] {
  if (target !== undefined && !Array.isArray(target)) {
    throw new Error("Target shape conflict at array branch");
  }

  const targetArray = target ?? [];
  assertNoSparseArray(targetArray, "Target tree");
  return targetArray;
}

function targetObjectForBranch(target: unknown): Record<string, unknown> {
  if (target !== undefined && !isRecord(target)) {
    throw new Error("Target shape conflict at object branch");
  }

  return target ?? {};
}

function targetChild(targetArray: readonly unknown[], index: number): unknown {
  return hasIndex(targetArray, index) ? targetArray[index] : undefined;
}

function fillMissing(source: JsonTree, target: unknown): FilledJsonTree {
  if (typeof source === "string") {
    if (target === undefined || isMissingTranslation(target)) {
      return markMissing(source);
    }

    if (typeof target !== "string") {
      throw new Error("Target shape conflict at string leaf");
    }

    return target;
  }

  if (Array.isArray(source)) {
    assertNoSparseArray(source, "Source tree");

    const targetArray = targetArrayForBranch(target);
    const result = source.map((child, index) =>
      fillMissing(child, targetChild(targetArray, index)),
    );

    for (let index = source.length; index < targetArray.length; index += 1) {
      const extraTargetValue = targetArray[index];
      assertFilledJsonTree(extraTargetValue, "Target tree");
      result.push(extraTargetValue);
    }

    return result;
  }

  const targetObject = targetObjectForBranch(target);
  const result: Record<string, FilledJsonTree> = {};

  for (const [key, child] of Object.entries(source)) {
    result[key] = fillMissing(child, targetObject[key]);
  }

  for (const [key, value] of Object.entries(targetObject)) {
    if (!hasOwnKey(result, key)) {
      assertFilledJsonTree(value, "Target tree");
      result[key] = value;
    }
  }

  return result;
}

function collectMissing(
  source: JsonTree,
  target: unknown,
  path: readonly PathSegment[],
  dict: TranslationDict,
  paths: Record<string, readonly PathSegment[]>,
  keys: string[],
): void {
  if (typeof source === "string") {
    if (target === undefined || isMissingTranslation(target)) {
      const key = `k${keys.length}`;
      keys.push(key);
      dict[key] = source;
      paths[key] = path;
      return;
    }

    if (typeof target !== "string") {
      throw new Error("Target shape conflict at string leaf");
    }

    return;
  }

  if (Array.isArray(source)) {
    assertNoSparseArray(source, "Source tree");

    const targetArray = targetArrayForBranch(target);
    source.forEach((child, index) => {
      collectMissing(
        child,
        targetChild(targetArray, index),
        [...path, index],
        dict,
        paths,
        keys,
      );
    });
    return;
  }

  const targetObject = targetObjectForBranch(target);
  for (const [key, child] of Object.entries(source)) {
    collectMissing(child, targetObject[key], [...path, key], dict, paths, keys);
  }
}

function getAtPath(
  value: FilledJsonTree,
  path: readonly PathSegment[],
): unknown {
  let current: unknown = value;

  for (const segment of path) {
    if (Array.isArray(current) && typeof segment === "number") {
      current = current[segment];
      continue;
    }

    if (isRecord(current) && typeof segment === "string") {
      current = current[segment];
      continue;
    }

    return undefined;
  }

  return current;
}

function setAtPath(
  value: FilledJsonTree,
  path: readonly PathSegment[],
  replacement: string,
): FilledJsonTree {
  if (path.length === 0) {
    return replacement;
  }

  const [segment, ...rest] = path;

  if (Array.isArray(value) && typeof segment === "number") {
    const next = [...value];
    next[segment] = setAtPath(next[segment], rest, replacement);
    return next;
  }

  if (isRecord(value) && typeof segment === "string") {
    const objectValue = value as Record<string, FilledJsonTree>;

    return {
      ...objectValue,
      [segment]: setAtPath(objectValue[segment], rest, replacement),
    };
  }

  return value;
}

export function deepFillMissingStrings(
  source: JsonTree,
  target: unknown,
): FilledJsonTree {
  return fillMissing(source, target);
}

export function translatableSubtree(
  source: JsonTree,
  target: unknown,
): TranslatableSubtree {
  const dict: TranslationDict = {};
  const paths: Record<string, readonly PathSegment[]> = {};
  const keys: string[] = [];

  collectMissing(source, target, [], dict, paths, keys);

  return {
    dict,
    pathMap: {
      source: cloneJsonTree(source),
      paths,
      keys,
    },
  };
}

export function mergeTranslations(
  target: unknown,
  dict: TranslationDict,
  pathMap: TranslationPathMap,
): FilledJsonTree {
  let result = deepFillMissingStrings(pathMap.source, target);
  const expectedKeys = new Set(pathMap.keys);

  for (const key of Object.keys(dict)) {
    if (!expectedKeys.has(key)) {
      throw new Error(`Unexpected translation key ${key}`);
    }
  }

  for (const key of pathMap.keys) {
    const path = pathMap.paths[key];
    const translation = dict[key];

    if (path === undefined) {
      throw new Error(`Missing path for translation key ${key}`);
    }

    if (translation === undefined) {
      throw new Error(`Missing translation for key ${key}`);
    }

    if (!isMissingTranslation(getAtPath(result, path))) {
      throw new Error(`Translation path for key ${key} is not missing`);
    }

    result = setAtPath(result, path, translation);
  }

  return result;
}
