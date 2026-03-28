/**
 * Manual mock for ../evolu module
 */
export const evolu = {
  insert: jest.fn((_table: string, data: unknown) => data),
  update: jest.fn((_table: string, data: unknown) => data),
  createQuery: jest.fn((fn: unknown) => ({ type: 'QUERY', fn })),
};
