import {
  deepFillMissingStrings,
  mergeTranslations,
  translatableSubtree,
} from "../../../scripts/i18n/jsonTreeUtils";

describe("jsonTreeUtils", () => {
  test("fills an empty target and merges translations in source key order", () => {
    const source = {
      actions: {
        save: "Save",
        cancel: "Cancel",
      },
      status: "Ready",
    };

    const filled = deepFillMissingStrings(source, {});

    expect(filled).toEqual({
      actions: {
        save: expect.objectContaining({ source: "Save" }),
        cancel: expect.objectContaining({ source: "Cancel" }),
      },
      status: expect.objectContaining({ source: "Ready" }),
    });

    const { dict, pathMap } = translatableSubtree(source, {});

    expect(dict).toEqual({
      k0: "Save",
      k1: "Cancel",
      k2: "Ready",
    });
    expect(Object.values(pathMap.paths)).toEqual([
      ["actions", "save"],
      ["actions", "cancel"],
      ["status"],
    ]);

    expect(
      Object.keys(
        mergeTranslations(
          {},
          { k0: "Speichern", k1: "Abbrechen", k2: "Bereit" },
          pathMap,
        ) as Record<string, unknown>,
      ),
    ).toEqual(["actions", "status"]);
  });

  test("preserves existing target values and only extracts missing leaves", () => {
    const source = {
      actions: {
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
      },
      status: "Ready",
    };
    const target = {
      actions: {
        cancel: "Abbrechen",
      },
      status: "Bereit",
    };

    const filled = deepFillMissingStrings(source, target);
    const { dict, pathMap } = translatableSubtree(source, target);
    const merged = mergeTranslations(
      target,
      { k0: "Speichern", k1: "Loeschen" },
      pathMap,
    );

    expect(filled).toMatchObject({
      actions: {
        save: expect.objectContaining({ source: "Save" }),
        cancel: "Abbrechen",
        delete: expect.objectContaining({ source: "Delete" }),
      },
      status: "Bereit",
    });
    expect(dict).toEqual({ k0: "Save", k1: "Delete" });
    expect(merged).toEqual({
      actions: {
        save: "Speichern",
        cancel: "Abbrechen",
        delete: "Loeschen",
      },
      status: "Bereit",
    });
  });

  test("is a no-op for a fully populated target", () => {
    const source = {
      actions: {
        save: "Save",
      },
    };
    const target = {
      actions: {
        save: "Speichern",
      },
    };

    const { dict, pathMap } = translatableSubtree(source, target);

    expect(dict).toEqual({});
    expect(deepFillMissingStrings(source, target)).toEqual(target);
    expect(mergeTranslations(target, {}, pathMap)).toEqual(target);
  });

  test("handles arrays of strings without overwriting populated indexes", () => {
    const source = {
      steps: ["Start", "Review", "Finish"],
    };
    const target = {
      steps: ["Starten"],
    };

    const { dict, pathMap } = translatableSubtree(source, target);
    const merged = mergeTranslations(
      target,
      { k0: "Pruefen", k1: "Abschliessen" },
      pathMap,
    );

    expect(dict).toEqual({ k0: "Review", k1: "Finish" });
    expect(merged).toEqual({
      steps: ["Starten", "Pruefen", "Abschliessen"],
    });
  });

  test("keeps identical source strings at different paths as separate keys", () => {
    const source = {
      primary: {
        label: "Done",
      },
      secondary: {
        label: "Done",
      },
    };

    const { dict, pathMap } = translatableSubtree(source, {});
    const merged = mergeTranslations(
      {},
      { k0: "Fertig", k1: "Erledigt" },
      pathMap,
    );

    expect(dict).toEqual({ k0: "Done", k1: "Done" });
    expect(merged).toEqual({
      primary: { label: "Fertig" },
      secondary: { label: "Erledigt" },
    });
  });

  test("does not expose real key names in the translation dict", () => {
    const source = {
      deeply: {
        nested: {
          secretContextKey: "Translate me",
        },
      },
    };

    const { dict } = translatableSubtree(source, {});

    expect(Object.keys(dict)).toEqual(["k0"]);
    expect(JSON.stringify(dict)).not.toContain("secretContextKey");
  });

  test("throws instead of overwriting target shape conflicts", () => {
    expect(() =>
      deepFillMissingStrings({ nested: { label: "Label" } }, { nested: "Alt" }),
    ).toThrow("Target shape conflict");

    expect(() =>
      translatableSubtree({ label: "Label" }, { label: { text: "Alt" } }),
    ).toThrow("Target shape conflict");
  });

  test("does not mutate source, target, dict, or path map", () => {
    const source = {
      actions: {
        save: "Save",
        cancel: "Cancel",
      },
    };
    const target = {
      actions: {
        cancel: "Abbrechen",
      },
    };

    const sourceBefore = JSON.stringify(source);
    const targetBefore = JSON.stringify(target);
    const { dict, pathMap } = translatableSubtree(source, target);
    const dictBefore = JSON.stringify(dict);
    const pathMapBefore = JSON.stringify(pathMap);

    deepFillMissingStrings(source, target);
    mergeTranslations(target, { k0: "Speichern" }, pathMap);

    expect(JSON.stringify(source)).toBe(sourceBefore);
    expect(JSON.stringify(target)).toBe(targetBefore);
    expect(JSON.stringify(dict)).toBe(dictBefore);
    expect(JSON.stringify(pathMap)).toBe(pathMapBefore);
  });
});
