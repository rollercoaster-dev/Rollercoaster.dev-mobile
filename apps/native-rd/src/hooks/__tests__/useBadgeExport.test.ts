import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

jest.mock('../useCreateBadge', () => ({
  PLACEHOLDER_IMAGE_URI: 'pending:baked-image',
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
}));

import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useBadgeExport } from '../useBadgeExport';

jest.spyOn(Alert, 'alert');

describe('useBadgeExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
  });

  describe('exportImage', () => {
    it('shares the image via Sharing.shareAsync', async () => {
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportImage('file:///badges/badge.png');
      });

      expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///badges/badge.png', {
        UTI: 'public.png',
        mimeType: 'image/png',
        dialogTitle: 'Save Badge Image',
      });
    });

    it('shows alert when imageUri is placeholder', async () => {
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportImage('pending:baked-image');
      });

      expect(Alert.alert).toHaveBeenCalledWith('No image available', expect.any(String));
      expect(Sharing.shareAsync).not.toHaveBeenCalled();
    });

    it('shows alert when imageUri is null', async () => {
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportImage(null);
      });

      expect(Alert.alert).toHaveBeenCalledWith('No image available', expect.any(String));
    });

    it('shows alert when sharing is unavailable', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportImage('file:///badges/badge.png');
      });

      expect(Alert.alert).toHaveBeenCalledWith('Sharing unavailable', expect.any(String));
    });

    it('shows alert and resets loading when shareAsync throws', async () => {
      (Sharing.shareAsync as jest.Mock).mockRejectedValueOnce(new Error('permission denied'));
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportImage('file:///badges/badge.png');
      });

      expect(Alert.alert).toHaveBeenCalledWith('Export failed', expect.any(String));
      expect(result.current.isExportingImage).toBe(false);
    });
  });

  describe('exportJSON', () => {
    it('writes temp file, shares, then deletes', async () => {
      const { result } = renderHook(() => useBadgeExport());
      const credential = '{"type":"VerifiableCredential"}';

      await act(async () => {
        await result.current.exportJSON(credential, 'Learn TypeScript');
      });

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringContaining('badge-Learn-TypeScript-'),
        credential,
        { encoding: FileSystem.EncodingType.UTF8 },
      );
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        expect.stringContaining('.json'),
        expect.objectContaining({ UTI: 'public.json' }),
      );
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        expect.stringContaining('.json'),
        { idempotent: true },
      );
    });

    it('cleans up temp file even when shareAsync throws', async () => {
      (Sharing.shareAsync as jest.Mock).mockRejectedValueOnce(new Error('cancelled'));
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportJSON('{}', 'Test');
      });

      expect(FileSystem.deleteAsync).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith('Export failed', expect.any(String));
    });

    it('shows alert when credential is null', async () => {
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportJSON(null, 'Test');
      });

      expect(Alert.alert).toHaveBeenCalledWith('No credential', expect.any(String));
      expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
    });

    it('does not write temp file when sharing is unavailable', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportJSON('{"type":"VC"}', 'Test');
      });

      expect(Alert.alert).toHaveBeenCalledWith('Sharing unavailable', expect.any(String));
      expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
      expect(Sharing.shareAsync).not.toHaveBeenCalled();
    });

    it('shows alert when cacheDirectory is null', async () => {
      const original = FileSystem.cacheDirectory;
      Object.defineProperty(FileSystem, 'cacheDirectory', { value: null, writable: true });

      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportJSON('{}', 'Test');
      });

      expect(Alert.alert).toHaveBeenCalledWith('Export failed', 'Cannot access the device cache directory.');
      expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();

      Object.defineProperty(FileSystem, 'cacheDirectory', { value: original, writable: true });
    });
  });
});
