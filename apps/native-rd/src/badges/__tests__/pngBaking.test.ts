/**
 * Tests for vendored PNG baking module and badge image generator.
 *
 * These tests run entirely in Node/Jest — no React Native environment needed.
 * The png-chunks-extract/encode packages are CJS and work without transformation.
 */
import { Buffer } from 'buffer';
import { generateBadgeImagePNG, DEFAULT_BADGE_COLOR } from '../badgeImageGenerator';
import { bakePNG, unbakePNG, isPNG } from '../png-baking';

// The OB3 credential stub we bake into test images
const CREDENTIAL_STUB = {
  '@context': [
    'https://www.w3.org/ns/credentials/v2',
    'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json',
  ],
  id: 'urn:uuid:test-cred-001',
  type: ['VerifiableCredential', 'OpenBadgeCredential'],
  issuer: { id: 'did:key:testkey', type: 'Profile' },
  validFrom: '2026-01-01T00:00:00.000Z',
  credentialSubject: { id: 'did:key:testkey', type: 'AchievementSubject', achievement: {} },
  proof: {
    type: 'DataIntegrityProof',
    cryptosuite: 'eddsa-rdfc-2022',
    proofValue: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
};

describe('generateBadgeImagePNG', () => {
  it('generates a valid PNG for a standard hex color', () => {
    const png = generateBadgeImagePNG('#FF5733');
    expect(isPNG(Buffer.from(png))).toBe(true);
  });

  it('generates a valid PNG for the default accent color', () => {
    const png = generateBadgeImagePNG(DEFAULT_BADGE_COLOR);
    expect(isPNG(Buffer.from(png))).toBe(true);
  });

  it('falls back gracefully for an invalid hex color', () => {
    // Should not throw — uses DEFAULT_BADGE_COLOR fallback
    const png = generateBadgeImagePNG('not-a-color');
    expect(isPNG(Buffer.from(png))).toBe(true);
  });

  it.each([
    ['#000000', 'black'],
    ['#ffffff', 'white'],
    ['#4B7BE5', 'blue'],
    ['#FF5733', 'red-orange'],
  ])('generates a non-empty PNG for %s (%s)', (hex) => {
    const png = generateBadgeImagePNG(hex);
    // PNG signature (8 bytes) + IHDR chunk (25 bytes) minimum
    expect(png.length).toBeGreaterThan(33);
  });
});

describe('unbakePNG on an unbaked PNG', () => {
  it('returns null when the PNG contains no credential', () => {
    const png = generateBadgeImagePNG('#4B7BE5');
    const result = unbakePNG(Buffer.from(png));
    expect(result).toBeNull();
  });
});

describe('bakePNG / unbakePNG roundtrip', () => {
  it('baked PNG is still a valid PNG', () => {
    const png = generateBadgeImagePNG('#FF5733');
    const baked = bakePNG(Buffer.from(png), JSON.stringify(CREDENTIAL_STUB));
    expect(isPNG(baked)).toBe(true);
  });

  it('unbakePNG recovers the original credential object', () => {
    const png = generateBadgeImagePNG('#FF5733');
    const baked = bakePNG(Buffer.from(png), JSON.stringify(CREDENTIAL_STUB));
    const recovered = unbakePNG(baked);
    expect(recovered).toEqual(CREDENTIAL_STUB);
  });

  it('baked PNG is larger than the original (iTXt chunk was added)', () => {
    const png = generateBadgeImagePNG('#FF5733');
    const baked = bakePNG(Buffer.from(png), JSON.stringify(CREDENTIAL_STUB));
    expect(baked.length).toBeGreaterThan(png.length);
  });

  it('re-baking replaces the existing credential — only one iTXt chunk with the keyword exists after re-bake', () => {
    const png = generateBadgeImagePNG('#FF5733');
    const bakedOnce = bakePNG(Buffer.from(png), JSON.stringify(CREDENTIAL_STUB));

    const updatedCredential = { ...CREDENTIAL_STUB, id: 'urn:uuid:updated' };
    const bakedTwice = bakePNG(bakedOnce, JSON.stringify(updatedCredential));

    // Verify exactly one credential is recoverable — not an accumulation
    const recovered = unbakePNG(bakedTwice) as unknown as typeof updatedCredential;
    expect(recovered.id).toBe('urn:uuid:updated');
    // Verify original is gone: the old id must not appear in the raw buffer
    expect(bakedTwice.toString()).not.toContain('urn:uuid:test-cred-001');
  });

  it('roundtrips a JWS string credential (compact serialization path)', () => {
    const png = generateBadgeImagePNG('#4B7BE5');
    // JWS compact serialization: three base64url segments separated by dots
    const jws = 'eyJhbGciOiJFZERTQSJ9.eyJzdWIiOiJkaWQ6a2V5OnRlc3QifQ.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const baked = bakePNG(Buffer.from(png), jws);

    const recovered = unbakePNG(baked);
    // JWS path returns the raw string, not a parsed object
    expect(typeof recovered).toBe('string');
    expect(recovered).toBe(jws);
  });
});

describe('bakePNG error handling', () => {
  it('throws if the input buffer is not a PNG', () => {
    const notAPng = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    expect(() => bakePNG(notAPng, JSON.stringify(CREDENTIAL_STUB))).toThrow(
      'Invalid PNG image: missing PNG signature',
    );
  });
});
