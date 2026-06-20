/**
 * Test setup for database tests
 * Mocks Evolu to test validation logic without actual database
 *
 * External modules (@evolu/common, @rollercoaster-dev/rd-logger) are
 * mapped via moduleNameMapper in jest.config.js to ./mocks/ files.
 * Only the local evolu module needs jest.mock() here.
 */

// Evolu mutations return a Result ({ ok, value } | { ok, error }) rather than
// the raw row — mirror that here so query code that checks `result.ok` (e.g.
// applyStepOrdinals) exercises the success path. `value` carries the mutation
// payload back so tests can assert what was written.
jest.mock("../evolu", () => ({
  evolu: {
    insert: jest.fn((_table: string, data: unknown) => ({
      ok: true,
      value: data,
    })),
    update: jest.fn((_table: string, data: unknown) => ({
      ok: true,
      value: data,
    })),
    createQuery: jest.fn((fn: unknown) => ({ type: "QUERY", fn })),
  },
}));
