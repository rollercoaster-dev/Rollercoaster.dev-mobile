/**
 * Pins the APP_VARIANT contract in app.config.js. The Android E2E lane
 * (scripts/run-e2e.sh --android) depends on the local `.dev` build alone
 * registering `rollercoasterdev-dev`; a store/EAS build gaining that scheme
 * would bring back the app-chooser hang the scheme exists to avoid.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appConfig = require("../../app.config.js") as (input: {
  config: Record<string, unknown>;
}) => Record<string, unknown>;

const baseConfig = {
  name: "Rollercoaster.dev",
  android: { package: "dev.rollercoaster.app", versionCode: 1 },
  ios: { bundleIdentifier: "dev.rollercoaster.app" },
};

const originalVariant = process.env.APP_VARIANT;

afterEach(() => {
  if (originalVariant === undefined) delete process.env.APP_VARIANT;
  else process.env.APP_VARIANT = originalVariant;
});

describe("app.config.js APP_VARIANT contract", () => {
  test("development → .dev package plus the local dev-client scheme", () => {
    process.env.APP_VARIANT = "development";
    const out = appConfig({ config: baseConfig });

    expect(out.android).toEqual({
      package: "dev.rollercoaster.app.dev",
      versionCode: 1,
    });
    expect(out.scheme).toEqual(["rollercoasterdev-dev"]);
    expect(out.ios).toBe(baseConfig.ios);
  });

  test("development appends to a scheme app.json already declares", () => {
    process.env.APP_VARIANT = "development";
    const out = appConfig({
      config: { ...baseConfig, scheme: "rollercoasterdev" },
    });

    expect(out.scheme).toEqual(["rollercoasterdev", "rollercoasterdev-dev"]);
  });

  test.each([undefined, "preview", "production"])(
    "APP_VARIANT=%s → base package, no extra scheme",
    (variant) => {
      if (variant === undefined) delete process.env.APP_VARIANT;
      else process.env.APP_VARIANT = variant;
      const out = appConfig({ config: baseConfig });

      expect(out.android).toEqual(baseConfig.android);
      expect(out).not.toHaveProperty("scheme");
      expect(out.name).toBe("Rollercoaster.dev");
    },
  );
});
