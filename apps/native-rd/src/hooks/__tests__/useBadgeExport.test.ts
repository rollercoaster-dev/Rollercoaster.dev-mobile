import { renderHook, act } from "@testing-library/react-native";
import { Alert, Platform } from "react-native";

import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { useBadgeExport } from "../useBadgeExport";

jest.mock("../useCreateBadge", () => ({
  PLACEHOLDER_IMAGE_URI: "pending:baked-image",
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  EncodingType: { UTF8: "utf8", Base64: "base64" },
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  readAsStringAsync: jest.fn(() => Promise.resolve("base64-bytes")),
  deleteAsync: jest.fn(() => Promise.resolve()),
  StorageAccessFramework: {
    requestDirectoryPermissionsAsync: jest.fn(() =>
      Promise.resolve({ granted: true, directoryUri: "content:///picked" }),
    ),
    createFileAsync: jest.fn(() =>
      Promise.resolve("content:///picked/badge.png"),
    ),
  },
}));

jest.spyOn(Alert, "alert");

// Platform.OS is a runtime property; defineProperty is lighter than
// re-mocking react-native and is reset to "ios" in beforeEach.
function setPlatform(os: "ios" | "android") {
  Object.defineProperty(Platform, "OS", {
    configurable: true,
    get: () => os,
  });
}

describe("useBadgeExport", () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    setPlatform("ios");
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
      "base64-bytes",
    );
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
    (
      FileSystem.StorageAccessFramework
        .requestDirectoryPermissionsAsync as jest.Mock
    ).mockResolvedValue({ granted: true, directoryUri: "content:///picked" });
    (
      FileSystem.StorageAccessFramework.createFileAsync as jest.Mock
    ).mockResolvedValue("content:///picked/badge.png");
  });

  afterAll(() => {
    setPlatform(originalPlatform as "ios" | "android");
  });

  describe("exportVerifiableBadge", () => {
    it("[iOS] shares the baked PNG via Sharing.shareAsync with the verifiable dialog title", async () => {
      setPlatform("ios");
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportVerifiableBadge("file:///badges/badge.png");
      });

      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        "file:///badges/badge.png",
        {
          UTI: "public.png",
          mimeType: "image/png",
          dialogTitle: "Export Verifiable Badge",
        },
      );
      // SAF must not be touched on iOS.
      expect(
        FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync,
      ).not.toHaveBeenCalled();
    });

    it("[Android] writes the baked PNG bytes via SAF, bypassing the share sheet", async () => {
      setPlatform("android");
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportVerifiableBadge("file:///badges/badge.png");
      });

      expect(
        FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync,
      ).toHaveBeenCalled();
      expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(
        "file:///badges/badge.png",
        { encoding: FileSystem.EncodingType.Base64 },
      );
      expect(
        FileSystem.StorageAccessFramework.createFileAsync,
      ).toHaveBeenCalledWith(
        "content:///picked",
        expect.stringMatching(/^badge-\d+\.png$/),
        "image/png",
      );
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        "content:///picked/badge.png",
        "base64-bytes",
        { encoding: FileSystem.EncodingType.Base64 },
      );
      // We must NOT fall back to the share sheet on Android — that's the
      // whole reason this branch exists.
      expect(Sharing.shareAsync).not.toHaveBeenCalled();
    });

    it("[Android] returns quietly when the user cancels the folder picker", async () => {
      setPlatform("android");
      (
        FileSystem.StorageAccessFramework
          .requestDirectoryPermissionsAsync as jest.Mock
      ).mockResolvedValueOnce({ granted: false });
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportVerifiableBadge("file:///badges/badge.png");
      });

      expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
      expect(result.current.isExportingImage).toBe(false);
    });

    it("shows alert when imageUri is null", async () => {
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportVerifiableBadge(null);
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "No image available",
        expect.any(String),
      );
      expect(Sharing.shareAsync).not.toHaveBeenCalled();
    });

    it("shows alert when imageUri is the placeholder", async () => {
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportVerifiableBadge("pending:baked-image");
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "No image available",
        expect.any(String),
      );
    });

    it("[iOS] shows alert when sharing is unavailable", async () => {
      setPlatform("ios");
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportVerifiableBadge("file:///badges/badge.png");
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "Sharing unavailable",
        expect.any(String),
      );
    });

    it("[Android] surfaces an alert and resets loading when SAF writes fail", async () => {
      setPlatform("android");
      (FileSystem.writeAsStringAsync as jest.Mock).mockRejectedValueOnce(
        new Error("permission denied"),
      );
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportVerifiableBadge("file:///badges/badge.png");
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "Export failed",
        expect.any(String),
      );
      expect(result.current.isExportingImage).toBe(false);
    });

    it("returns silently when the share sheet is cancelled (no Export failed alert)", async () => {
      setPlatform("ios");
      (Sharing.shareAsync as jest.Mock).mockRejectedValueOnce(
        new Error("User cancelled the share action"),
      );
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportVerifiableBadge("file:///badges/badge.png");
      });

      expect(Alert.alert).not.toHaveBeenCalled();
      expect(result.current.isExportingImage).toBe(false);
    });

    it("alerts with an unavailable message on unsupported platforms", async () => {
      setPlatform("web" as "ios");
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportVerifiableBadge("file:///badges/badge.png");
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "Export unavailable",
        expect.stringContaining("iOS and Android"),
      );
      expect(Sharing.shareAsync).not.toHaveBeenCalled();
      expect(
        FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync,
      ).not.toHaveBeenCalled();
    });
  });

  describe("exportImage", () => {
    it("shares the image via Sharing.shareAsync", async () => {
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportImage("file:///badges/badge.png");
      });

      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        "file:///badges/badge.png",
        {
          UTI: "public.png",
          mimeType: "image/png",
          dialogTitle: "Save Badge Image",
        },
      );
    });

    it("shows alert when imageUri is placeholder", async () => {
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportImage("pending:baked-image");
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "No image available",
        expect.any(String),
      );
      expect(Sharing.shareAsync).not.toHaveBeenCalled();
    });

    it("shows alert when imageUri is null", async () => {
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportImage(null);
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "No image available",
        expect.any(String),
      );
    });

    it("shows alert when sharing is unavailable", async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportImage("file:///badges/badge.png");
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "Sharing unavailable",
        expect.any(String),
      );
    });

    it("shows alert and resets loading when shareAsync throws", async () => {
      (Sharing.shareAsync as jest.Mock).mockRejectedValueOnce(
        new Error("permission denied"),
      );
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportImage("file:///badges/badge.png");
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "Export failed",
        expect.any(String),
      );
      expect(result.current.isExportingImage).toBe(false);
    });
  });

  describe("exportJSON", () => {
    it("writes temp file, shares, then deletes", async () => {
      const { result } = renderHook(() => useBadgeExport());
      const credential = '{"type":"VerifiableCredential"}';

      await act(async () => {
        await result.current.exportJSON(credential, "Learn TypeScript");
      });

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringContaining("badge-Learn-TypeScript-"),
        credential,
        { encoding: FileSystem.EncodingType.UTF8 },
      );
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        expect.stringContaining(".json"),
        expect.objectContaining({ UTI: "public.json" }),
      );
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        expect.stringContaining(".json"),
        { idempotent: true },
      );
    });

    it("cleans up temp file even when shareAsync throws", async () => {
      (Sharing.shareAsync as jest.Mock).mockRejectedValueOnce(
        new Error("cancelled"),
      );
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportJSON("{}", "Test");
      });

      expect(FileSystem.deleteAsync).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        "Export failed",
        expect.any(String),
      );
    });

    it("shows alert when credential is null", async () => {
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportJSON(null, "Test");
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "No credential",
        expect.any(String),
      );
      expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
    });

    it("does not write temp file when sharing is unavailable", async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportJSON('{"type":"VC"}', "Test");
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "Sharing unavailable",
        expect.any(String),
      );
      expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
      expect(Sharing.shareAsync).not.toHaveBeenCalled();
    });

    it("shows alert when cacheDirectory is null", async () => {
      const original = FileSystem.cacheDirectory;
      Object.defineProperty(FileSystem, "cacheDirectory", {
        value: null,
        writable: true,
      });

      const { result } = renderHook(() => useBadgeExport());

      await act(async () => {
        await result.current.exportJSON("{}", "Test");
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "Export failed",
        "Cannot access the device cache directory.",
      );
      expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();

      Object.defineProperty(FileSystem, "cacheDirectory", {
        value: original,
        writable: true,
      });
    });
  });
});
