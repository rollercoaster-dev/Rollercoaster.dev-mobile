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

// Utility: converts Date to ISO string
export const dateToDateIso = (date: Date) => date.toISOString();

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
