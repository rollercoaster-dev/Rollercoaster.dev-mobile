import { Alert, Linking } from "react-native";
import * as Sharing from "expo-sharing";
import { renderHook, act } from "../../__tests__/test-utils";
import {
  tryParseJSON,
  mimeToUTI,
  openLinkInBrowser,
  openFile,
  useEvidenceViewer,
} from "../evidenceViewers";
import type { Evidence } from "../../components/EvidenceThumbnail";
import { i18n } from "../../i18n";

let mockFileExists = true;
jest.mock("expo-file-system", () => ({
  File: jest.fn().mockImplementation(() => ({
    get exists() {
      return mockFileExists;
    },
  })),
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

describe("tryParseJSON", () => {
  it("parses valid JSON", () => {
    expect(tryParseJSON('{"durationMs":3000}')).toEqual({ durationMs: 3000 });
  });

  it("returns null for invalid JSON", () => {
    expect(tryParseJSON("not json")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(tryParseJSON("")).toBeNull();
  });
});

describe("mimeToUTI", () => {
  it.each([
    ["application/pdf", "com.adobe.pdf"],
    ["text/plain", "public.plain-text"],
    ["image/jpeg", "public.jpeg"],
    ["image/png", "public.png"],
  ])("maps %s → %s", (mime, uti) => {
    expect(mimeToUTI(mime)).toBe(uti);
  });

  it("returns public.item for unknown types", () => {
    expect(mimeToUTI("application/x-unknown")).toBe("public.item");
  });
});

describe("openLinkInBrowser i18n", () => {
  it("alerts with translated strings when the URL cannot be opened", async () => {
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    const canOpenSpy = jest
      .spyOn(Linking, "canOpenURL")
      .mockResolvedValue(false);

    await openLinkInBrowser("bad://url");

    expect(alertSpy).toHaveBeenCalledWith(
      i18n.t("evidenceViewer:errors.cannotOpenLink"),
      i18n.t("evidenceViewer:errors.unableToOpen", { uri: "bad://url" }),
    );

    alertSpy.mockRestore();
    canOpenSpy.mockRestore();
  });

  it("alerts with the failedToOpen string when Linking throws", async () => {
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    const canOpenSpy = jest
      .spyOn(Linking, "canOpenURL")
      .mockRejectedValue(new Error("boom"));

    await openLinkInBrowser("ftp://broken");

    expect(alertSpy).toHaveBeenCalledWith(
      i18n.t("evidenceViewer:errors.cannotOpenLink"),
      i18n.t("evidenceViewer:errors.failedToOpen", { uri: "ftp://broken" }),
    );

    alertSpy.mockRestore();
    canOpenSpy.mockRestore();
  });
});

describe("openFile i18n", () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    mockFileExists = true;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("alerts fileNotFound when the file does not exist", async () => {
    mockFileExists = false;

    await openFile("file:///gone.pdf");

    expect(alertSpy).toHaveBeenCalledWith(
      i18n.t("evidenceViewer:errors.fileNotFound"),
      i18n.t("evidenceViewer:errors.fileMayBeDeleted"),
    );
  });

  it("alerts sharingUnavailable when sharing is not available", async () => {
    jest.spyOn(Sharing, "isAvailableAsync").mockResolvedValue(false);

    await openFile("file:///doc.pdf");

    expect(alertSpy).toHaveBeenCalledWith(
      i18n.t("evidenceViewer:errors.cannotOpenFile"),
      i18n.t("evidenceViewer:errors.sharingUnavailable"),
    );
  });

  it("alerts openFileFailed when sharing throws", async () => {
    jest.spyOn(Sharing, "isAvailableAsync").mockResolvedValue(true);
    jest.spyOn(Sharing, "shareAsync").mockRejectedValue(new Error("boom"));

    await openFile("file:///doc.pdf");

    expect(alertSpy).toHaveBeenCalledWith(
      i18n.t("evidenceViewer:errors.cannotOpenFile"),
      i18n.t("evidenceViewer:errors.openFileFailed"),
    );
  });
});

describe("useEvidenceViewer.viewEvidence i18n — missing uri", () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const missingUriCases: readonly [Evidence["type"], string, string][] = [
    [
      "photo",
      i18n.t("evidenceViewer:errors.cannotView"),
      i18n.t("evidenceViewer:errors.photoMissing"),
    ],
    [
      "video",
      i18n.t("evidenceViewer:errors.cannotPlay"),
      i18n.t("evidenceViewer:errors.videoMissing"),
    ],
    [
      "voice_memo",
      i18n.t("evidenceViewer:errors.cannotPlay"),
      i18n.t("evidenceViewer:errors.audioMissing"),
    ],
    [
      "file",
      i18n.t("evidenceViewer:errors.cannotOpen"),
      i18n.t("evidenceViewer:errors.fileMissing"),
    ],
  ];

  it.each(missingUriCases)(
    "alerts translated strings when %s evidence has no uri",
    (type, title, message) => {
      const { result } = renderHook(() => useEvidenceViewer());

      act(() => {
        result.current.viewEvidence({
          id: "1",
          title: "x",
          type,
          uri: undefined,
        });
      });

      expect(alertSpy).toHaveBeenCalledWith(title, message);
    },
  );
});
