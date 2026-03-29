/**
 * Manual mock for @rollercoaster-dev/rd-logger
 */
export const Logger = jest.fn().mockImplementation(() => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));
