import { Buffer } from "buffer";
import { captureBadge } from "../captureBadge";
import {
  captureRef,
  MOCK_PNG_BASE64,
} from "../../__tests__/mocks/react-native-view-shot";
import { isPNG, bakePNG } from "../png-baking";

// The mock is wired via jest.config.js moduleNameMapper
const mockRef = { current: {} } as React.RefObject<unknown>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("captureBadge", () => {
  it("returns a Buffer on successful capture", async () => {
    const result = await captureBadge(mockRef);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a valid PNG", async () => {
    const result = await captureBadge(mockRef);
    expect(isPNG(result)).toBe(true);
  });

  it("uses default 512x512 dimensions", async () => {
    await captureBadge(mockRef);
    expect(captureRef).toHaveBeenCalledWith(
      mockRef,
      expect.objectContaining({ width: 512, height: 512 }),
    );
  });

  it("accepts custom width/height options", async () => {
    await captureBadge(mockRef, { width: 256, height: 256 });
    expect(captureRef).toHaveBeenCalledWith(
      mockRef,
      expect.objectContaining({ width: 256, height: 256 }),
    );
  });

  it("throws when ref.current is null", async () => {
    const nullRef = { current: null } as React.RefObject<unknown>;
    await expect(captureBadge(nullRef)).rejects.toThrow(
      "captureBadge: ref.current is null",
    );
  });

  it("throws when captureRef rejects", async () => {
    captureRef.mockRejectedValueOnce(new Error("View not mounted"));
    await expect(captureBadge(mockRef)).rejects.toThrow(
      "captureBadge: captureRef failed — View not mounted",
    );
  });

  it("throws when captured data is not a valid PNG", async () => {
    captureRef.mockResolvedValueOnce(
      Buffer.from("not a png").toString("base64"),
    );
    await expect(captureBadge(mockRef)).rejects.toThrow(
      "captureBadge: captured data is not a valid PNG",
    );
  });

  it("produces a PNG that can be baked without errors", async () => {
    const pngBuffer = await captureBadge(mockRef);
    const credential = JSON.stringify({
      "@context": [
        "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
      ],
      type: ["VerifiableCredential", "OpenBadgeCredential"],
    });
    const baked = bakePNG(pngBuffer, credential);
    expect(isPNG(baked)).toBe(true);
  });
});
