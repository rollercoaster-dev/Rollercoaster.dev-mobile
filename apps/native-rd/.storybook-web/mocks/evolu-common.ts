/**
 * Storybook ESM mock for @evolu/common
 *
 * Stubs the Evolu schema validators, branded type constructors,
 * and createEvolu factory so the db module can load without
 * a real SQLite backend.
 */

/** Schema validator stub — .orThrow() returns the value as-is. */
const makeValidator = () => ({
  orThrow: (value: unknown) => value,
});

// Branded type constructor — id('Goal') returns a validator stub
export const id = (_table: string) => makeValidator();

// Schema validators used in schema.ts and queries.ts
export const NonEmptyString1000 = makeValidator();
export const NonEmptyString = makeValidator();
export const Int = makeValidator();
export const SimpleName = makeValidator();
export const DateIso = makeValidator();

// Schema combinator
export const nullOr = (_schema: unknown) => makeValidator();

/**
 * Evolu's `Result` constructors, same shape as the real `Result.js`.
 *
 * `err` is imported directly by `src/utils/localDay.ts`, so it has to be a
 * named export here or the whole db module graph fails to load in Storybook.
 */
export const ok = <T>(value: T) => ({ ok: true as const, value });
export const err = <E>(error: E) => ({ ok: false as const, error });

/**
 * Converts a Date to a branded `DateIso`, wrapped in a `Result` — the real
 * signature. Callers unwrap it (`if (!now.ok) throw …`, `db/queries.ts:226`),
 * so a bare string here makes `.ok` undefined and sends every completion path
 * in Storybook down its failure branch.
 */
export const dateToDateIso = (date: Date) => {
  const time = date.getTime();
  if (Number.isNaN(time)) return err({ type: "DateIso", value: date });
  return ok(date.toISOString());
};

// SQLite boolean constant
export const sqliteTrue = 1;

// Stub evolu instance with no-op methods
const makeEvoluInstance = () => ({
  createQuery: (fn: unknown) => fn,
  create: () => ({}),
  update: () => {},
});

/**
 * createEvolu is curried: createEvolu(deps)(schema, options) => evoluInstance
 */
export const createEvolu =
  (_deps: unknown) => (_schema: unknown, _options?: unknown) =>
    makeEvoluInstance();
