import { Alert, Linking } from "react-native";
import { tryParseJSON, mimeToUTI, openLinkInBrowser } from "../evidenceViewers";
import "../../i18n";

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
      "Cannot open link",
      "Unable to open: bad://url",
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
      "Cannot open link",
      "Failed to open: ftp://broken",
    );

    alertSpy.mockRestore();
    canOpenSpy.mockRestore();
  });
});
