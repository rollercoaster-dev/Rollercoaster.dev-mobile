/**
 * Tests for useUserKey hook
 *
 * Verifies the first-launch key generation lifecycle:
 * - generates keypair when UserSettings has no keyId
 * - does NOT regenerate when keyId already exists
 * - surfaces error when SecureStore is unavailable
 */
import { renderHook, act } from '@testing-library/react-native';
import { useQuery } from '@evolu/react';
import { useUserKey } from '../useUserKey';
import { updateUserSettingsKey, createUserSettings } from '../../db';

// Mock crypto module to isolate from real SecureStore
jest.mock('../../crypto', () => ({
  keyProvider: {
    isAvailable: jest.fn().mockResolvedValue(true),
    generateKeyPair: jest.fn().mockResolvedValue({ keyId: 'generated-key-id', publicKeyJwk: {} }),
  },
}));

jest.mock('../../db', () => ({
  userSettingsQuery: 'mock-query',
  createUserSettings: jest.fn(),
  updateUserSettingsKey: jest.fn(),
}));

const mockUseQuery = useQuery as jest.Mock;
const mockCreateUserSettings = createUserSettings as jest.Mock;
const mockUpdateUserSettingsKey = updateUserSettingsKey as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { keyProvider: mockKeyProvider } = require('../../crypto');

const MOCK_SETTINGS_ID = 'settings-id-001' as Parameters<typeof updateUserSettingsKey>[0];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useUserKey', () => {
  describe('when no UserSettings row exists yet', () => {
    it('calls createUserSettings to initialise the singleton', () => {
      mockUseQuery.mockReturnValue([]);
      renderHook(() => useUserKey());
      expect(mockCreateUserSettings).toHaveBeenCalledTimes(1);
    });

    it('returns isReady: false while settings are missing', () => {
      mockUseQuery.mockReturnValue([]);
      const { result } = renderHook(() => useUserKey());
      expect(result.current.isReady).toBe(false);
      expect(result.current.keyId).toBeNull();
    });
  });

  describe('when UserSettings exists but keyId is null', () => {
    it('generates a keypair and stores the keyId', async () => {
      mockUseQuery.mockReturnValue([{ id: MOCK_SETTINGS_ID, keyId: null }]);

      renderHook(() => useUserKey());
      await act(async () => {});

      expect(mockKeyProvider.isAvailable).toHaveBeenCalled();
      expect(mockKeyProvider.generateKeyPair).toHaveBeenCalled();
      expect(mockUpdateUserSettingsKey).toHaveBeenCalledWith(
        MOCK_SETTINGS_ID,
        'generated-key-id',
      );
    });

    it('does not generate a second keypair on re-render', async () => {
      mockUseQuery.mockReturnValue([{ id: MOCK_SETTINGS_ID, keyId: null }]);

      const { rerender } = renderHook(() => useUserKey());
      await act(async () => {});

      rerender(() => useUserKey());
      await act(async () => {});

      expect(mockKeyProvider.generateKeyPair).toHaveBeenCalledTimes(1);
    });
  });

  describe('when UserSettings already has a keyId', () => {
    it('does not generate a new keypair', async () => {
      mockUseQuery.mockReturnValue([{ id: MOCK_SETTINGS_ID, keyId: 'existing-key-id' }]);

      renderHook(() => useUserKey());
      await act(async () => {});

      expect(mockKeyProvider.generateKeyPair).not.toHaveBeenCalled();
    });

    it('returns isReady: true and the existing keyId', async () => {
      mockUseQuery.mockReturnValue([{ id: MOCK_SETTINGS_ID, keyId: 'existing-key-id' }]);

      const { result } = renderHook(() => useUserKey());

      expect(result.current.isReady).toBe(true);
      expect(result.current.keyId).toBe('existing-key-id');
      expect(result.current.error).toBeNull();
    });
  });

  describe('when SecureStore is unavailable', () => {
    it('surfaces an error without crashing', async () => {
      mockUseQuery.mockReturnValue([{ id: MOCK_SETTINGS_ID, keyId: null }]);
      mockKeyProvider.isAvailable.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useUserKey());
      await act(async () => {});

      expect(result.current.error).toContain('Secure storage is unavailable');
      expect(mockKeyProvider.generateKeyPair).not.toHaveBeenCalled();
    });

    it('does not call updateUserSettingsKey when unavailable', async () => {
      mockUseQuery.mockReturnValue([{ id: MOCK_SETTINGS_ID, keyId: null }]);
      mockKeyProvider.isAvailable.mockResolvedValueOnce(false);

      renderHook(() => useUserKey());
      await act(async () => {});

      expect(mockUpdateUserSettingsKey).not.toHaveBeenCalled();
    });
  });

  describe('when key generation throws', () => {
    it('surfaces an error message', async () => {
      mockUseQuery.mockReturnValue([{ id: MOCK_SETTINGS_ID, keyId: null }]);
      mockKeyProvider.generateKeyPair.mockRejectedValueOnce(new Error('crypto unavailable'));

      const { result } = renderHook(() => useUserKey());
      await act(async () => {});

      expect(result.current.error).toContain('crypto unavailable');
    });
  });
});
