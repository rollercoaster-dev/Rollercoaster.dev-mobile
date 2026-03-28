import { parsePlannedEvidenceTypes } from '../parsePlannedEvidenceTypes';

describe('parsePlannedEvidenceTypes', () => {
  // Suppress console noise from cases that trigger warnings/errors
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test.each([
    { input: null, expected: null, label: 'null input' },
    { input: undefined, expected: null, label: 'undefined input' },
    { input: '', expected: null, label: 'empty string' },
    { input: '["photo","note"]', expected: ['photo', 'note'], label: 'valid array' },
    { input: '[]', expected: null, label: 'empty array' },
    { input: '"not-an-array"', expected: null, label: 'non-array JSON (string)' },
    { input: '42', expected: null, label: 'non-array JSON (number)' },
    { input: '{"a":1}', expected: null, label: 'non-array JSON (object)' },
    { input: '{bad json', expected: null, label: 'invalid JSON' },
  ])('returns $expected for $label', ({ input, expected }) => {
    expect(parsePlannedEvidenceTypes(input)).toEqual(expected);
  });

  it('filters non-string elements from the array', () => {
    expect(parsePlannedEvidenceTypes('[1,"photo",{},"note",null]')).toEqual(['photo', 'note']);
  });

  it('returns null when all elements are non-string', () => {
    expect(parsePlannedEvidenceTypes('[1,2,3]')).toBeNull();
  });

  it('logs a warning for non-array JSON', () => {
    parsePlannedEvidenceTypes('"string"');
    expect(warnSpy).toHaveBeenCalledWith(
      '[parsePlannedEvidenceTypes] not an array',
      expect.objectContaining({ raw: '"string"' }),
    );
  });

  it('logs an error for invalid JSON', () => {
    parsePlannedEvidenceTypes('{bad');
    expect(errorSpy).toHaveBeenCalledWith(
      '[parsePlannedEvidenceTypes] invalid JSON',
      expect.objectContaining({ raw: '{bad' }),
    );
  });

  it('logs a warning when filtering non-string elements', () => {
    parsePlannedEvidenceTypes('[1,"photo"]');
    expect(warnSpy).toHaveBeenCalledWith(
      '[parsePlannedEvidenceTypes] filtered non-string elements',
      expect.objectContaining({ raw: '[1,"photo"]' }),
    );
  });

  it('uses custom logger when provided', () => {
    const logger = { warn: jest.fn(), error: jest.fn() };
    parsePlannedEvidenceTypes('"string"', logger);
    expect(logger.warn).toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
