/**
 * Manual mock for @evolu/common
 * Provides realistic behavior for branded type validators used in queries.ts
 */

export const NonEmptyString = {
  orNull: (str: string) => {
    if (typeof str !== "string" || str.length === 0) return null;
    return str;
  },
  orThrow: (str: string) => {
    if (typeof str !== "string" || str.length === 0) {
      throw new Error(`Invalid NonEmptyString: ${str}`);
    }
    return str;
  },
};

export const NonEmptyString1000 = {
  orNull: (str: string) => {
    if (typeof str !== "string" || str.length === 0 || str.length > 1000)
      return null;
    return str;
  },
  orThrow: (str: string) => {
    if (typeof str !== "string" || str.length === 0 || str.length > 1000) {
      throw new Error(`Invalid NonEmptyString1000: ${str}`);
    }
    return str;
  },
};

export const Int = {
  orNull: (n: number) => {
    if (typeof n !== "number" || !Number.isInteger(n)) return null;
    return n;
  },
};

export const dateToDateIso = (date: Date) => {
  try {
    return { ok: true, value: date.toISOString() };
  } catch {
    return { ok: false };
  }
};

export const sqliteTrue = 1;

export const id = (name: string) => ({ Type: name });
export const nullOr = (schema: unknown) => schema;
export const DateIso = "DateIso";
