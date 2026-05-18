import { useState, useCallback } from "react";
import { Alert, Platform } from "react-native";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { PLACEHOLDER_IMAGE_URI } from "./useCreateBadge";

export function useBadgeExport() {
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isExportingJSON, setIsExportingJSON] = useState(false);

  /**
   * Verifiable-badge export: writes the on-disk baked PNG (which carries
   * the OB 3.0 `iTXt` credential chunk) through a byte-preserving channel.
   *
   * - iOS: routes via the share sheet. AirDrop / Save to Files / Mail /
   *   iMessage / first-party tiles preserve the PNG bytes (and therefore
   *   the iTXt chunk). 3rd-party messenger photo tiles will still transcode;
   *   that is a receiver-side problem we cannot solve from here.
   * - Android: bypasses the share sheet entirely via the Storage Access
   *   Framework. The user picks a destination folder; the file lands
   *   byte-for-byte. This avoids the dominant Android failure mode where
   *   messengers re-encode "photo" attachments and strip ancillary chunks.
   */
  const exportVerifiableBadge = useCallback(async (imageUri: string | null) => {
    if (!imageUri || imageUri === PLACEHOLDER_IMAGE_URI) {
      Alert.alert(
        "No image available",
        "This badge does not have a baked image yet.",
      );
      return;
    }

    setIsExportingImage(true);
    try {
      if (Platform.OS === "android") {
        const perm =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!perm.granted) {
          // User cancelled the folder picker — not an error.
          return;
        }
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const filename = `badge-${Date.now()}.png`;
        const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
          perm.directoryUri,
          filename,
          "image/png",
        );
        await FileSystem.writeAsStringAsync(destUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(
          "Sharing unavailable",
          "Sharing is not available on this device.",
        );
        return;
      }
      await Sharing.shareAsync(imageUri, {
        UTI: "public.png",
        mimeType: "image/png",
        dialogTitle: "Export Verifiable Badge",
      });
    } catch (error) {
      console.error("[useBadgeExport] Failed to export verifiable badge", {
        imageUri,
        error,
      });
      Alert.alert(
        "Export failed",
        "Something went wrong exporting the verifiable badge.",
      );
    } finally {
      setIsExportingImage(false);
    }
  }, []);

  const exportImage = useCallback(async (imageUri: string | null) => {
    if (!imageUri || imageUri === PLACEHOLDER_IMAGE_URI) {
      Alert.alert(
        "No image available",
        "This badge does not have a baked image yet.",
      );
      return;
    }

    setIsExportingImage(true);
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(
          "Sharing unavailable",
          "Sharing is not available on this device.",
        );
        return;
      }
      await Sharing.shareAsync(imageUri, {
        UTI: "public.png",
        mimeType: "image/png",
        dialogTitle: "Save Badge Image",
      });
    } catch (error) {
      console.error("[useBadgeExport] Failed to export image", {
        imageUri,
        error,
      });
      Alert.alert(
        "Export failed",
        "Something went wrong exporting the badge image.",
      );
    } finally {
      setIsExportingImage(false);
    }
  }, []);

  const exportJSON = useCallback(
    async (credential: string | null, goalTitle: string) => {
      if (!credential) {
        Alert.alert(
          "No credential",
          "This badge does not have a credential yet.",
        );
        return;
      }

      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) {
        Alert.alert(
          "Export failed",
          "Cannot access the device cache directory.",
        );
        return;
      }

      setIsExportingJSON(true);
      const safeName = goalTitle.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 40);
      const tempUri = `${cacheDir}badge-${safeName}-${Date.now()}.json`;
      try {
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          Alert.alert(
            "Sharing unavailable",
            "Sharing is not available on this device.",
          );
          return;
        }

        await FileSystem.writeAsStringAsync(tempUri, credential, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        await Sharing.shareAsync(tempUri, {
          UTI: "public.json",
          mimeType: "application/ld+json",
          dialogTitle: "Export Badge Credential",
        });
      } catch (error) {
        console.error("[useBadgeExport] Failed to export credential", {
          goalTitle,
          error,
        });
        Alert.alert(
          "Export failed",
          "Something went wrong exporting the credential.",
        );
      } finally {
        await FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(
          (cleanupErr) => {
            console.warn("[useBadgeExport] Failed to clean up temp file", {
              tempUri,
              cleanupErr,
            });
          },
        );
        setIsExportingJSON(false);
      }
    },
    [],
  );

  return {
    exportVerifiableBadge,
    exportImage,
    exportJSON,
    isExportingImage,
    isExportingJSON,
  };
}
