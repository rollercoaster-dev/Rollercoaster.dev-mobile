/**
 * Test setup for database tests
 * Mocks Evolu to test validation logic without actual database
 *
 * External modules (@evolu/common, @rollercoaster-dev/rd-logger) are
 * mapped via moduleNameMapper in jest.config.js to ./mocks/ files.
 * Only the local evolu module needs jest.mock() here.
 */

jest.mock('../evolu', () => ({
  evolu: {
    insert: jest.fn((_table: string, data: unknown) => data),
    update: jest.fn((_table: string, data: unknown) => data),
    createQuery: jest.fn((fn: unknown) => ({ type: 'QUERY', fn })),
  },
}));
