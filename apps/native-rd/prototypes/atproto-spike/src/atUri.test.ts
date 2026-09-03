import { describe, expect, test } from "bun:test";
import { buildAtUri, parseAtUri } from "./atUri.ts";

describe("parseAtUri", () => {
  test("splits a DID-authority record URI into its three parts", () => {
    expect(
      parseAtUri("at://did:plc:abc123/dev.rollercoaster.badge.spike/3kxyz"),
    ).toEqual({
      authority: "did:plc:abc123",
      collection: "dev.rollercoaster.badge.spike",
      rkey: "3kxyz",
    });
  });

  test("accepts a handle as authority", () => {
    expect(parseAtUri("at://alice.bsky.social/app.bsky.feed.post/1").authority).toBe(
      "alice.bsky.social",
    );
  });

  test("rejects a repo-level URI with no collection/rkey", () => {
    expect(() => parseAtUri("at://did:plc:abc123")).toThrow(/Not a record AT-URI/);
  });

  test("round-trips through buildAtUri", () => {
    const uri = "at://did:plc:abc123/dev.rollercoaster.badge.spike/3kxyz";
    expect(buildAtUri(parseAtUri(uri))).toBe(uri);
  });
});
