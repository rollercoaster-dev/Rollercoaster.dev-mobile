import { i18n } from "../index";
import { themeOptions } from "../../hooks/useTheme";
import { densityOptions } from "../../utils/density";
import { STATUS_BADGE_VARIANTS } from "../../components/StatusBadge/StatusBadge.styles";
import { LIFECYCLE_MODES } from "../../components/ModeIndicator";

// `LIFECYCLE_MODES` is derived from `MODE_CONFIG: Record<LifecycleMode, …>`
// in ModeIndicator.tsx, so adding a union member without updating the config
// fails type-check at the source — not silently here.

// Catches the gap that locale-parity.test.ts can't: a TS union member
// (DensityLevel / ThemeName / LifecycleMode) added without a matching JSON
// copy entry. Consumers build keys dynamically via
// `t(\`density.options.${id}.label\`)`, and on miss i18next returns the key
// tail verbatim — which renders as UI in production because the missing-key
// handler is __DEV__-gated.
//
// Use `i18n.exists(key)` for the forward check. `expect(t(key)).not.toBe(key)`
// looks correct but is a no-op: when passed `"common:foo.bar"`, i18next strips
// the namespace and returns `"foo.bar"` on miss, never equal to the full key.

describe("option array ↔ i18n key parity", () => {
  describe.each(themeOptions)("themeOptions[$id]", ({ id }) => {
    test("common:theme.options.<id>.label resolves", () => {
      expect(i18n.exists(`common:theme.options.${id}.label`)).toBe(true);
    });

    test("common:theme.options.<id>.description resolves", () => {
      expect(i18n.exists(`common:theme.options.${id}.description`)).toBe(true);
    });
  });

  describe.each(densityOptions)("densityOptions[$id]", ({ id }) => {
    test("settings:density.options.<id>.label resolves", () => {
      expect(i18n.exists(`settings:density.options.${id}.label`)).toBe(true);
    });

    test("settings:density.options.<id>.description resolves", () => {
      expect(i18n.exists(`settings:density.options.${id}.description`)).toBe(
        true,
      );
    });
  });

  describe.each(STATUS_BADGE_VARIANTS.map((variant) => ({ variant })))(
    "STATUS_BADGE_VARIANTS[$variant]",
    ({ variant }) => {
      test("common:status.<variant> resolves", () => {
        expect(i18n.exists(`common:status.${variant}`)).toBe(true);
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
  // iterates STATUS_BADGE_VARIANTS.
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

  describe.each(LIFECYCLE_MODES.map((mode) => ({ mode })))(
    "LIFECYCLE_MODES[$mode]",
    ({ mode }) => {
      test(`common:modeIndicator.${mode} resolves`, () => {
        expect(i18n.exists(`common:modeIndicator.${mode}`)).toBe(true);
      });
    },
  );

  test("common:modeIndicator keyset matches LifecycleMode union", () => {
    const bundle = i18n.getResourceBundle("en", "common") as {
      modeIndicator: Record<string, unknown>;
    };
    const jsonKeys = new Set(
      Object.keys(bundle.modeIndicator).filter((k) => k !== "a11y"),
    );
    const unionKeys = new Set<string>(LIFECYCLE_MODES);
    expect(jsonKeys).toEqual(unionKeys);
  });

  // Forward-only: `common:timeline.a11y.step` interpolates `{{status}}` as a
  // string (not a TS union), so a reverse keyset assertion would have no
  // basis. The forward check guarantees the template-literal `t()` callsites
  // in MiniTimeline and ProgressDots resolve to a real translation.
  test("common:timeline.a11y.step resolves", () => {
    expect(i18n.exists("common:timeline.a11y.step")).toBe(true);
  });
});
