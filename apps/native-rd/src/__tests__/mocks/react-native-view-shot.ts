/**
 * Mock for react-native-view-shot
 *
 * Returns a base64-encoded 1x1 transparent PNG by default.
 */

// Minimal valid 1x1 RGBA PNG as base64
export const MOCK_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export const captureRef = jest.fn().mockResolvedValue(MOCK_PNG_BASE64);
