/**
 * Tests for useCreateBadge hook
 */
import { renderHook, act } from '@testing-library/react-native';
import { useQuery } from '@evolu/react';
import { useCreateBadge } from '../useCreateBadge';
import { completeGoal, createBadge } from '../../db';
import type { GoalId } from '../../db';

// openbadges-core and jose are ESM-only — mock at module level
jest.mock('@rollercoaster-dev/openbadges-core', () => ({
  serializeOB3: jest.fn(() => ({
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    id: 'urn:uuid:cred-01',
    type: ['VerifiableCredential'],
    issuer: {},
    validFrom: '2026-01-01T00:00:00.000Z',
    credentialSubject: {},
  })),
}));

jest.mock('../../crypto', () => ({
  keyProvider: {
    getPublicKey: jest.fn().mockResolvedValue({ kty: 'OKP', crv: 'Ed25519', x: 'testkey' }),
    sign: jest.fn().mockResolvedValue(new Uint8Array(64)),
  },
}));

jest.mock('../useUserKey', () => ({
  useUserKey: jest.fn().mockReturnValue({ keyId: 'key-001', isReady: true, error: null }),
}));

jest.mock('../../db', () => ({
  goalsQuery: 'mock-goals-query',
  evidenceByGoalQuery: jest.fn(() => 'mock-evidence-query'),
  stepEvidenceByGoalQuery: jest.fn(() => 'mock-step-evidence-query'),
  badgeByGoalQuery: jest.fn(() => 'mock-badge-query'),
  canCompleteGoal: (evidence: Array<{ type: string | null }>) =>
    evidence.some((e) => e.type !== null),
  completeGoal: jest.fn(),
  createBadge: jest.fn(),
}));

jest.mock('../../badges', () => ({
  buildUnsignedCredential: jest.fn(() => ({
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    id: 'urn:uuid:cred-01',
    type: ['VerifiableCredential'],
  })),
  buildDid: jest.fn(() => 'did:key:testkey'),
  generateBadgeImagePNG: jest.fn(() => new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])),
  bakePNG: jest.fn(() => Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  isPNG: jest.fn((buf: Buffer) => buf.length >= 8 && buf[0] === 137 && buf[1] === 80),
  saveBadgePNG: jest.fn(() => Promise.resolve('file:///app/badges/test-badge.png')),
  DEFAULT_BADGE_COLOR: '#4B7BE5',
}));

const mockUseQuery = useQuery as jest.Mock;
const mockCompleteGoal = completeGoal as jest.Mock;
const mockCreateBadge = createBadge as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { keyProvider: mockKeyProvider } = require('../../crypto');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useUserKey: mockUseUserKey } = require('../useUserKey');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockBadges = require('../../badges');

const GOAL_ID = 'goal-01' as GoalId;
const MOCK_GOAL = { id: GOAL_ID, title: 'My Goal', description: null, color: '#FF5733', status: 'active' };

beforeEach(() => {
  jest.clearAllMocks();
  mockUseUserKey.mockReturnValue({ keyId: 'key-001', isReady: true, error: null });
  mockBadges.generateBadgeImagePNG.mockReturnValue(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));
  mockBadges.bakePNG.mockReturnValue(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  mockBadges.saveBadgePNG.mockResolvedValue('file:///app/badges/test-badge.png');
  // Default: configure mockUseQuery to return values in sequence per render
  mockUseQuery.mockImplementation((query: string) => {
    if (query === 'mock-goals-query') return [MOCK_GOAL];
    if (query === 'mock-evidence-query') return [{ id: 'ev-1', type: 'photo', goalId: GOAL_ID }];
    if (query === 'mock-step-evidence-query') return [];
    if (query === 'mock-badge-query') return [];
    return [];
  });
});

describe('useCreateBadge', () => {
  describe('when key is not ready (isReady: false)', () => {
    it('returns status: loading — transient, key is still initialising', () => {
      mockUseUserKey.mockReturnValue({ keyId: null, isReady: false, error: null });
      mockUseQuery.mockImplementation((query: string) => {
        if (query === 'mock-badge-query') return [];
        return [MOCK_GOAL];
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID));
      expect(result.current.status).toBe('loading');
    });
  });

  describe('when badge already exists', () => {
    it('returns status: done without creating a new badge', async () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === 'mock-goals-query') return [MOCK_GOAL];
        if (query === 'mock-badge-query') return [{ id: 'badge-01', goalId: GOAL_ID }];
        return [];
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(result.current.status).toBe('done');
      expect(mockCreateBadge).not.toHaveBeenCalled();
    });
  });

  describe('successful badge creation', () => {
    it('calls keyProvider.getPublicKey and sign', async () => {
      renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(mockKeyProvider.getPublicKey).toHaveBeenCalledWith('key-001');
      expect(mockKeyProvider.sign).toHaveBeenCalled();
    });

    it('calls createBadge before completeGoal (so a createBadge failure does not leave goal completed without badge)', async () => {
      const callOrder: string[] = [];
      mockCompleteGoal.mockImplementation(() => callOrder.push('completeGoal'));
      mockCreateBadge.mockImplementation(() => callOrder.push('createBadge'));

      renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(callOrder).toEqual(['createBadge', 'completeGoal']);
    });

    it('calls createBadge with the real image URI from saveBadgePNG (not the placeholder)', async () => {
      renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(mockCreateBadge).toHaveBeenCalledWith(
        expect.objectContaining({
          goalId: GOAL_ID,
          imageUri: 'file:///app/badges/test-badge.png',
        }),
      );
    });

    it('stores a credential JSON string', async () => {
      renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(mockCreateBadge).toHaveBeenCalledWith(
        expect.objectContaining({
          credential: expect.stringContaining('VerifiableCredential'),
        }),
      );
    });

    it('reaches status: done after successful creation', async () => {
      const { result } = renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(result.current.status).toBe('done');
      expect(result.current.error).toBeNull();
    });

    it('passes the goal color to generateBadgeImagePNG', async () => {
      renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(mockBadges.generateBadgeImagePNG).toHaveBeenCalledWith('#FF5733');
    });

    it('falls back to DEFAULT_BADGE_COLOR when goal.color is null', async () => {
      const goalWithoutColor = { ...MOCK_GOAL, color: null };
      mockUseQuery.mockImplementation((query: string) => {
        if (query === 'mock-goals-query') return [goalWithoutColor];
        if (query === 'mock-badge-query') return [];
        return [];
      });

      renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(mockBadges.generateBadgeImagePNG).toHaveBeenCalledWith('#4B7BE5');
    });
  });

  describe('when design option is provided', () => {
    it('passes design to createBadge', async () => {
      const designJson = '{"shape":"circle","color":"#FF0000","iconName":"Trophy","iconWeight":"regular","frame":"none","title":"Test"}';
      renderHook(() => useCreateBadge(GOAL_ID, { design: designJson }));
      await act(async () => {});

      expect(mockCreateBadge).toHaveBeenCalledWith(
        expect.objectContaining({ design: designJson }),
      );
    });

    it('does not include design key when option is not provided', async () => {
      renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      const callArg = mockCreateBadge.mock.calls[0][0] as Record<string, unknown>;
      expect(callArg).not.toHaveProperty('design');
    });
  });

  describe('when capturedPng is provided', () => {
    it('passes the captured PNG to bakePNG instead of generating one', async () => {
      const fakePng = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
      renderHook(() => useCreateBadge(GOAL_ID, { capturedPng: fakePng }));
      await act(async () => {});

      expect(mockBadges.bakePNG).toHaveBeenCalledWith(fakePng, expect.any(String));
    });

    it('does NOT call generateBadgeImagePNG', async () => {
      const fakePng = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
      renderHook(() => useCreateBadge(GOAL_ID, { capturedPng: fakePng }));
      await act(async () => {});

      expect(mockBadges.generateBadgeImagePNG).not.toHaveBeenCalled();
    });
  });

  describe('when key is ready but keyId is null', () => {
    it('returns status: no-key', () => {
      mockUseUserKey.mockReturnValue({ keyId: null, isReady: true, error: null });
      mockUseQuery.mockImplementation((query: string) => {
        if (query === 'mock-badge-query') return [];
        return [MOCK_GOAL];
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID));
      expect(result.current.status).toBe('no-key');
    });
  });

  describe('when getPublicKey throws', () => {
    it('sets status: error and populates error message', async () => {
      mockKeyProvider.getPublicKey.mockRejectedValueOnce(new Error('key not found in SecureStore'));

      const { result } = renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(result.current.status).toBe('error');
      expect(result.current.error).toContain('key not found in SecureStore');
    });
  });

  describe('when signing throws', () => {
    it('sets status: error and populates error message', async () => {
      mockKeyProvider.sign.mockRejectedValueOnce(new Error('crypto unavailable'));

      const { result } = renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(result.current.status).toBe('error');
      expect(result.current.error).toContain('crypto unavailable');
    });
  });

  describe('when image generation fails (generateBadgeImagePNG throws)', () => {
    it('sets status: error — PNG generation failure is a code defect, not recoverable', async () => {
      mockBadges.generateBadgeImagePNG.mockImplementationOnce(() => {
        throw new Error('PNG generation failed');
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      // generateBadgeImagePNG is pure computation — any throw is a code defect
      // and must propagate to the outer error handler, not degrade gracefully.
      expect(result.current.status).toBe('error');
      expect(result.current.error).toContain('PNG generation failed');
      expect(mockCreateBadge).not.toHaveBeenCalled();
    });
  });

  describe('when bakePNG fails', () => {
    it('sets status: error — corrupt PNG is a code defect, not recoverable', async () => {
      mockBadges.bakePNG.mockImplementationOnce(() => {
        throw new Error('corrupt PNG chunk');
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      // bakePNG throwing means the PNG we generated is corrupt — a code defect.
      // Must propagate to the outer error handler, not degrade gracefully.
      expect(result.current.status).toBe('error');
      expect(result.current.error).toContain('corrupt PNG chunk');
      expect(mockCreateBadge).not.toHaveBeenCalled();
    });
  });

  describe('when saveBadgePNG fails', () => {
    it('still calls createBadge with the placeholder URI (graceful degradation)', async () => {
      mockBadges.saveBadgePNG.mockRejectedValueOnce(new Error('disk full'));

      const { result } = renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(result.current.status).toBe('done');
      expect(mockCreateBadge).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUri: 'pending:baked-image',
        }),
      );
    });
  });

  describe('when createBadge throws', () => {
    it('sets status: error and does NOT call completeGoal (prevents partial state)', async () => {
      mockCreateBadge.mockImplementationOnce(() => {
        throw new Error('db write failed');
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(result.current.status).toBe('error');
      expect(result.current.error).toContain('db write failed');
      expect(mockCompleteGoal).not.toHaveBeenCalled();
    });
  });

  describe('proof value encoding', () => {
    it('stores a proof with a valid base64url proofValue (no +, /, or = chars)', async () => {
      // sign returns 64 zero bytes — deterministic base64url output
      mockKeyProvider.sign.mockResolvedValue(new Uint8Array(64));

      renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      const callArg = mockCreateBadge.mock.calls[0][0] as { credential: string };
      const credential = JSON.parse(callArg.credential) as Record<string, unknown>;
      const proof = credential['proof'] as Record<string, unknown>;

      expect(proof['proofValue']).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(proof['proofValue']).not.toContain('=');
      expect(proof['proofValue']).not.toContain('+');
      expect(proof['proofValue']).not.toContain('/');
    });
  });

  describe('step evidence includes stepTitle', () => {
    it('passes stepTitle from step evidence to buildUnsignedCredential', async () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === 'mock-goals-query') return [MOCK_GOAL];
        if (query === 'mock-evidence-query') return [{ id: 'ev-1', type: 'photo', goalId: GOAL_ID }];
        if (query === 'mock-step-evidence-query')
          return [{ id: 'ev-2', type: 'text', uri: 'content:text;hello', description: 'A note', stepTitle: 'Wire the box' }];
        if (query === 'mock-badge-query') return [];
        return [];
      });

      renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(mockBadges.buildUnsignedCredential).toHaveBeenCalledWith(
        expect.objectContaining({
          evidence: expect.arrayContaining([
            expect.objectContaining({ stepTitle: 'Wire the box' }),
          ]),
        }),
      );
    });

    it('omits stepTitle property for goal-level evidence', async () => {
      renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      const callArg = mockBadges.buildUnsignedCredential.mock.calls[0][0] as { evidence: Array<Record<string, unknown>> };
      const goalEvidence = callArg.evidence.find((e) => e.id === 'ev-1');
      expect(goalEvidence).not.toHaveProperty('stepTitle');
    });
  });

  describe('idempotency', () => {
    it('does not create a second badge on re-render', async () => {
      const { rerender } = renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      rerender(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(mockCreateBadge).toHaveBeenCalledTimes(1);
    });
  });
});
