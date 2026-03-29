import { tryParseJSON, mimeToUTI } from "../evidenceViewers";

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
