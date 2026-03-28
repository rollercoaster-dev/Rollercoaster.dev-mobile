import { isValidUrl, normalizeUrl } from '../url';

describe('isValidUrl', () => {
  it('accepts valid https URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('https://example.com/path')).toBe(true);
    expect(isValidUrl('https://example.com/path?q=1&b=2')).toBe(true);
    expect(isValidUrl('https://sub.example.com')).toBe(true);
    expect(isValidUrl('https://example.com:8080')).toBe(true);
    expect(isValidUrl('https://example.com/path#anchor')).toBe(true);
  });

  it('accepts valid http URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
    expect(isValidUrl('http://localhost:3000')).toBe(true);
  });

  it('rejects URLs without protocol', () => {
    expect(isValidUrl('example.com')).toBe(false);
    expect(isValidUrl('www.example.com')).toBe(false);
  });

  it('rejects non-http protocols', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false);
    expect(isValidUrl('file:///etc/passwd')).toBe(false);
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects empty and invalid input', () => {
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl('   ')).toBe(false);
    expect(isValidUrl('not a url')).toBe(false);
    expect(isValidUrl('://missing-protocol')).toBe(false);
  });

  it('handles null/undefined gracefully', () => {
    expect(isValidUrl(null as unknown as string)).toBe(false);
    expect(isValidUrl(undefined as unknown as string)).toBe(false);
  });

  it('trims whitespace before validating', () => {
    expect(isValidUrl('  https://example.com  ')).toBe(true);
    expect(isValidUrl('\nhttps://example.com\n')).toBe(true);
  });
});

describe('normalizeUrl', () => {
  it('trims whitespace', () => {
    expect(normalizeUrl('  https://example.com  ')).toBe('https://example.com');
    expect(normalizeUrl('\nhttps://example.com\n')).toBe('https://example.com');
  });

  it('preserves valid URLs as-is', () => {
    expect(normalizeUrl('https://example.com/path?q=1')).toBe(
      'https://example.com/path?q=1',
    );
  });
});
