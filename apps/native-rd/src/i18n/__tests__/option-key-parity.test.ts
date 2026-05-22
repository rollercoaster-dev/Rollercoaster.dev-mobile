import { i18n } from "../index";
import { themeOptions } from "../../hooks/useTheme";
import { densityOptions } from "../../utils/density";
import { STATUS_BADGE_VARIANTS } from "../../components/StatusBadge/StatusBadge.styles";

// Catches the gap that locale-parity.test.ts can't: a TS union member
// (DensityLevel / ThemeName) added without a matching JSON copy entry.
// Consumers build keys dynamically via `t(\`density.options.${id}.label\`)`,
// and on miss i18next returns the key path verbatim — which renders as UI
// in production because the missing-key handler is __DEV__-gated.
//
// Drift is detected by checking that the returned value differs from the
// fully-qualified key path. A real translation will, a missing key won't.

describe("option array ↔ i18n key parity", () => {
  describe.each(themeOptions)("themeOptions[$id]", ({ id }) => {
    test("common:theme.options.<id>.label resolves", () => {
      const key = `common:theme.options.${id}.label` as const;
      expect(i18n.t(key)).not.toBe(key);
    });

    test("common:theme.options.<id>.description resolves", () => {
      const key = `common:theme.options.${id}.description` as const;
      expect(i18n.t(key)).not.toBe(key);
    });
  });

  describe.each(densityOptions)("densityOptions[$id]", ({ id }) => {
    test("settings:density.options.<id>.label resolves", () => {
      const key = `settings:density.options.${id}.label` as const;
      expect(i18n.t(key)).not.toBe(key);
    });

    test("settings:density.options.<id>.description resolves", () => {
      const key = `settings:density.options.${id}.description` as const;
      expect(i18n.t(key)).not.toBe(key);
    });
  });

  describe.each(STATUS_BADGE_VARIANTS.map((variant) => ({ variant })))(
    "STATUS_BADGE_VARIANTS[$variant]",
    ({ variant }) => {
      test("common:status.<variant> resolves", () => {
        const key = `common:status.${variant}` as const;
        expect(i18n.t(key)).not.toBe(key);
      });
    },
  );

  // Reverse direction: orphan JSON entries (e.g. a key left behind after a
  // union member was renamed) would otherwise go undetected — locale-parity
  // would still see them as present in both en and pseudo, and the forward
  // tests above only walk the TS union. Asserts the JSON subtree's key set
  // matches the union exactly.
  test("common:theme.options keyset matches themeOptions", () => {
    const bundle = i18n.getResourceBundle("en", "common") as {
      theme: { options: Record<string, unknown> };
    };
    const jsonKeys = new Set(Object.keys(bundle.theme.options));
    const unionKeys = new Set(themeOptions.map((o) => o.id));
    expect(jsonKeys).toEqual(unionKeys);
  });

  test("settings:density.options keyset matches densityOptions", () => {
    const bundle = i18n.getResourceBundle("en", "settings") as {
      density: { options: Record<string, unknown> };
    };
    const jsonKeys = new Set(Object.keys(bundle.density.options));
    const unionKeys = new Set(densityOptions.map((o) => o.id));
    expect(jsonKeys).toEqual(unionKeys);
  });

  // Reverse direction for status: orphan JSON status entries (e.g. after a
  // variant was renamed) won't surface via the forward walk, which only
  // iterates STATUS_BADGE_VARIANTS. `a11yPrefix` is an a11y template, not a
  // variant — it's excluded from the variant comparison.
  test("common:status keyset matches STATUS_BADGE_VARIANTS", () => {
    const bundle = i18n.getResourceBundle("en", "common") as {
      status: Record<string, unknown>;
    };
    const jsonKeys = new Set(
      Object.keys(bundle.status).filter((k) => k !== "a11yPrefix"),
    );
    const unionKeys = new Set<string>(STATUS_BADGE_VARIANTS);
    expect(jsonKeys).toEqual(unionKeys);
  });
});
