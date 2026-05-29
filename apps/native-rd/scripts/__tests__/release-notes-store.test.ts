import { mergeStoreConfig } from "../release-notes-store";

describe("mergeStoreConfig", () => {
  test("injects releaseNotes into apple.info['en-US']", () => {
    const merged = mergeStoreConfig({}, "What's new copy");
    expect(merged.apple?.info?.["en-US"]).toEqual({
      releaseNotes: "What's new copy",
    });
  });

  test("preserves unrelated base fields and other locales", () => {
    const base = {
      configVersion: 0,
      apple: {
        info: {
          "en-US": { title: "Rollercoaster", subtitle: "Goals" },
          "de-DE": { title: "Rollercoaster DE" },
        },
      },
    };
    const merged = mergeStoreConfig(base, "Notes");
    expect(merged.configVersion).toBe(0);
    expect(merged.apple?.info?.["en-US"]).toEqual({
      title: "Rollercoaster",
      subtitle: "Goals",
      releaseNotes: "Notes",
    });
    expect(merged.apple?.info?.["de-DE"]).toEqual({
      title: "Rollercoaster DE",
    });
  });

  test("does not mutate the base object (defensive deep clone)", () => {
    const base = { apple: { info: { "en-US": { title: "X" } } } };
    const snapshot = JSON.stringify(base);
    mergeStoreConfig(base, "Notes");
    expect(JSON.stringify(base)).toBe(snapshot);
  });

  test("tolerates a base with no apple key", () => {
    const merged = mergeStoreConfig({ configVersion: 0 }, "Notes");
    expect(merged.configVersion).toBe(0);
    expect(merged.apple?.info?.["en-US"]?.releaseNotes).toBe("Notes");
  });

  test("tolerates a null/undefined base", () => {
    expect(mergeStoreConfig(null, "Notes").apple?.info?.["en-US"]).toEqual({
      releaseNotes: "Notes",
    });
  });
});
