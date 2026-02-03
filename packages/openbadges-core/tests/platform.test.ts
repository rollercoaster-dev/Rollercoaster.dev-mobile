import { describe, it, expect } from "bun:test";
import { detectPlatform, isBun, isNode } from "../src/platform.js";

describe("Platform Detection", () => {
  describe("detectPlatform()", () => {
    it("should detect Bun runtime", () => {
      const platform = detectPlatform();
      expect(platform).toBe("bun");
    });

    it("should return consistent results on multiple calls", () => {
      const first = detectPlatform();
      const second = detectPlatform();
      expect(first).toBe(second);
    });
  });

  describe("isBun()", () => {
    it("should return true in Bun environment", () => {
      expect(isBun()).toBe(true);
    });
  });

  describe("isNode()", () => {
    it("should return false in Bun environment", () => {
      expect(isNode()).toBe(false);
    });
  });
});
