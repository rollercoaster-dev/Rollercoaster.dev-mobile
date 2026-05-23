import { wrapWithTolgee } from "../tolgee";

// The Tolgee SDK wrap requires both env vars to be set. Validating that this
// fails loudly when wiring is half-configured catches a class of bug where a
// dev opts in but forgets the API key — silently swallowing this would let
// production-shape code path through with no Tolgee live edits, defeating the
// purpose of the env gate.
describe("wrapWithTolgee", () => {
  const originalApiUrl = process.env.EXPO_PUBLIC_TOLGEE_API_URL;
  const originalApiKey = process.env.EXPO_PUBLIC_TOLGEE_API_KEY;

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete process.env.EXPO_PUBLIC_TOLGEE_API_URL;
    } else {
      process.env.EXPO_PUBLIC_TOLGEE_API_URL = originalApiUrl;
    }
    if (originalApiKey === undefined) {
      delete process.env.EXPO_PUBLIC_TOLGEE_API_KEY;
    } else {
      process.env.EXPO_PUBLIC_TOLGEE_API_KEY = originalApiKey;
    }
  });

  test("throws when EXPO_PUBLIC_TOLGEE_API_URL is missing", () => {
    delete process.env.EXPO_PUBLIC_TOLGEE_API_URL;
    process.env.EXPO_PUBLIC_TOLGEE_API_KEY = "fake-key";
    expect(() => wrapWithTolgee({} as never)).toThrow(/EXPO_PUBLIC_TOLGEE/);
  });

  test("throws when EXPO_PUBLIC_TOLGEE_API_KEY is missing", () => {
    process.env.EXPO_PUBLIC_TOLGEE_API_URL = "http://localhost:8085";
    delete process.env.EXPO_PUBLIC_TOLGEE_API_KEY;
    expect(() => wrapWithTolgee({} as never)).toThrow(/EXPO_PUBLIC_TOLGEE/);
  });
});
