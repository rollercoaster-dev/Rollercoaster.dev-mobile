#!/usr/bin/env node
/**
 * Build Unistyles theme objects from design token JSON sources.
 *
 * Reads src/tokens/*.json and src/themes/*.json, generates TypeScript files
 * in build/unistyles/ that match the native-rd theme architecture:
 *   - palette.ts    — foundational color constants
 *   - tokens.ts     — spacing, sizing, radius, z-index, font weights, line heights
 *   - colorModes.ts — light/dark semantic color mappings
 *   - variants.ts   — accessibility variant partial overrides
 *   - narrative.ts  — narrative arc tokens for light/dark + variants
 *   - index.ts      — barrel re-export
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = import.meta.dirname;
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "build/unistyles");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert rem string to px number (1rem = 16px) */
function remToPx(val) {
  if (typeof val === "number") return val;
  const s = String(val);
  const m = s.match(/^([\d.]+)rem$/);
  if (m) return Math.round(parseFloat(m[1]) * 16 * 100) / 100;
  // px values — strip unit
  const px = s.match(/^([\d.]+)px$/);
  if (px) return parseFloat(px[1]);
  // unitless numbers
  const n = parseFloat(s);
  return isNaN(n) ? s : n;
}

/** kebab-case → camelCase, with number-leading keys left as-is */
function camel(s) {
  return s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

/** Read a JSON file relative to src/ */
async function readJSON(relPath) {
  const fullPath = join(SRC, relPath);
  const raw = await readFile(fullPath, "utf-8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse ${fullPath}: ${err.message}`);
  }
}

/** Extract $value from token, handling nested objects */
function val(token) {
  if (!token) return undefined;
  return token.$value ?? token;
}

/** Quote a key if it's not a valid JS identifier */
function safeKey(k) {
  return /^\d/.test(k) || /[^a-zA-Z0-9_$]/.test(k) ? `'${k}'` : k;
}

/** Filter out undefined values from an object */
function defined(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  );
}

/** Format object entries as TypeScript literal properties, filtering out undefined */
function toTSObject(entries) {
  return entries
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      return `  ${safeKey(k)}: ${typeof v === "string" ? `'${v}'` : v},`;
    })
    .join("\n");
}

/**
 * Build the canonical light-mode color map from semantic.json + colors.json.
 * Shared by buildColorModes (as the light mode) and buildVariants (as the diff baseline).
 */
function buildLightColorMap(semantic, colorData) {
  return {
    background: resolveRef(val(semantic.background), colorData, semantic),
    backgroundSecondary: resolveRef(val(semantic.muted), colorData, semantic),
    backgroundTertiary: resolveRef(val(semantic.border), colorData, semantic),
    text: resolveRef(val(semantic.foreground), colorData, semantic),
    textSecondary: resolveRef(
      val(semantic["text-secondary"]),
      colorData,
      semantic,
    ),
    textMuted: resolveRef(
      val(semantic["muted-foreground"]),
      colorData,
      semantic,
    ),
    accentPrimary: resolveRef(val(semantic.primary), colorData, semantic),
    accentPurple: resolveRef(val(semantic.secondary), colorData, semantic),
    accentMint: val(colorData.color["accent-mint"]),
    accentYellow: val(colorData.color["accent-yellow"]),
    border: resolveRef(val(semantic.border), colorData, semantic),
    shadow: val(colorData.color.black),
    focusRing: resolveRef(val(semantic.ring), colorData, semantic),
  };
}

/**
 * Extract a theme file's color values into the Colors interface shape.
 * Used for dark mode and all accessibility variant themes.
 */
function extractThemeColors(theme) {
  return {
    background: val(theme.surface?.background),
    backgroundSecondary: val(theme.surface?.muted),
    backgroundTertiary:
      val(theme.color?.gray?.["200"]) ?? val(theme.form?.border),
    text: val(theme.surface?.foreground),
    textSecondary: val(theme.typography?.["text-secondary"]),
    textMuted: val(theme.surface?.["muted-foreground"]),
    accentPrimary: val(theme.interactive?.primary),
    accentPurple:
      val(theme.color?.secondary) ?? val(theme.interactive?.secondary),
    accentMint: val(theme.color?.["accent-mint"]),
    accentYellow: val(theme.color?.["accent-yellow"]),
    border: val(theme.form?.border),
    shadow: val(theme.color?.black),
    focusRing: val(theme.form?.ring),
  };
}

/**
 * Extract narrative tokens from a theme file.
 * Falls back to undefined when not provided; caller is responsible for merge.
 */
function extractThemeNarrative(theme) {
  return {
    climb: {
      bg: val(theme.narrative?.climb?.bg),
      text: val(theme.narrative?.climb?.text),
    },
    drop: {
      bg: val(theme.narrative?.drop?.bg),
      bgEnd: val(theme.narrative?.drop?.["bg-end"]),
      text: val(theme.narrative?.drop?.text),
      accent: val(theme.narrative?.drop?.accent),
    },
    stories: {
      bg: val(theme.narrative?.stories?.bg),
      text: val(theme.narrative?.stories?.text),
      accent1: val(theme.narrative?.stories?.["accent-1"]),
      accent2: val(theme.narrative?.stories?.["accent-2"]),
      accent3: val(theme.narrative?.stories?.["accent-3"]),
      accent4: val(theme.narrative?.stories?.["accent-4"]),
      accentForeground: val(theme.narrative?.stories?.["accent-foreground"]),
    },
    relief: {
      bg: val(theme.narrative?.relief?.bg),
      text: val(theme.narrative?.relief?.text),
      accent: val(theme.narrative?.relief?.accent),
    },
  };
}

function mergeNarrative(base, override) {
  return {
    climb: { ...base.climb, ...defined(override.climb) },
    drop: { ...base.drop, ...defined(override.drop) },
    stories: { ...base.stories, ...defined(override.stories) },
    relief: { ...base.relief, ...defined(override.relief) },
  };
}

function diffNarrative(base, next) {
  const out = {};
  for (const section of ["climb", "drop", "stories", "relief"]) {
    const baseSection = base[section];
    const nextSection = next[section];
    const sectionDiff = {};
    for (const key of Object.keys(baseSection)) {
      if (nextSection[key] && nextSection[key] !== baseSection[key]) {
        sectionDiff[key] = nextSection[key];
      }
    }
    if (Object.keys(sectionDiff).length > 0) {
      out[section] = sectionDiff;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// palette.ts — foundational colors from src/tokens/colors.json
// ---------------------------------------------------------------------------

async function buildPalette() {
  const data = await readJSON("tokens/colors.json");
  const color = data.color;
  const entries = [];

  for (const [key, token] of Object.entries(color)) {
    if (key.startsWith("$")) continue;

    if (key === "gray") {
      for (const [shade, t] of Object.entries(token)) {
        if (shade.startsWith("$")) continue;
        entries.push([`gray${shade}`, val(t)]);
      }
    } else if (key === "highlight" || key === "ink" || key === "paper") {
      // Skip reference aliases — they duplicate other palette entries
      continue;
    } else if (typeof token === "object" && token !== null && !token.$value) {
      // Nested group (shouldn't happen besides gray, but be safe)
      continue;
    } else {
      entries.push([camel(key), val(token)]);
    }
  }

  const lines = entries.map(([k, v]) => `  ${k}: '${v}',`).join("\n");

  return `// Auto-generated from design-tokens. DO NOT EDIT.
export const palette = {
${lines}
} as const;

export type Palette = typeof palette;
`;
}

// ---------------------------------------------------------------------------
// tokens.ts — non-color primitives (spacing, typography, radius, zIndex)
// ---------------------------------------------------------------------------

async function buildTokens() {
  const spacing = await readJSON("tokens/spacing.json");
  const typo = await readJSON("tokens/typography.json");

  // space: rem → px
  const spaceEntries = Object.entries(spacing.space)
    .filter(([k]) => !k.startsWith("$"))
    .map(([k, t]) => [k, remToPx(val(t))]);

  // radius: rem → px
  const radiusEntries = Object.entries(spacing.radius)
    .filter(([k]) => !k.startsWith("$"))
    .map(([k, t]) => [camel(k), remToPx(val(t))]);

  // zIndex
  const zIndexEntries = Object.entries(spacing.zIndex)
    .filter(([k]) => !k.startsWith("$"))
    .map(([k, t]) => [camel(k), parseInt(val(t), 10)]);

  // font sizes → two scales: size (base) and sizeL (large-text theme)
  const fontSizes = typo.font.size;
  const sizeEntries = Object.entries(fontSizes)
    .filter(([k]) => !k.startsWith("$"))
    .map(([k, t]) => [camel(k), remToPx(val(t))]);

  // font weights (React Native iOS requires string values)
  const weightEntries = Object.entries(typo.font.weight)
    .filter(([k]) => !k.startsWith("$"))
    .map(([k, t]) => [camel(k), String(val(t))]);

  // line heights (unitless)
  const lineHeightEntries = Object.entries(typo.font.lineHeight)
    .filter(([k]) => !k.startsWith("$"))
    .map(([k, t]) => [camel(k), parseFloat(val(t))]);

  // borderWidth: px → number
  const borderWidthEntries = Object.entries(spacing.borderWidth)
    .filter(([k]) => !k.startsWith("$"))
    .map(([k, t]) => [camel(k), remToPx(val(t))]);

  // transition: ms string → number
  const transitionEntries = Object.entries(spacing.transition)
    .filter(([k]) => !k.startsWith("$"))
    .map(([k, t]) => {
      const v = String(val(t));
      const ms = v.match(/^(\d+)ms$/);
      return [camel(k), ms ? parseInt(ms[1], 10) : parseInt(v, 10)];
    });

  // shadow: parse CSS shadow strings into RN shadow objects
  const shadowEntries = Object.entries(spacing.shadow)
    .filter(([k]) => !k.startsWith("$"))
    .map(([k, t]) => {
      const raw = val(t);
      if (raw === "none") {
        return [camel(k), { offsetX: 0, offsetY: 0, radius: 0, opacity: 0 }];
      }
      // Parse CSS box-shadow: supports "X Y blur [spread] rgba(...)" with px or unitless 0
      // Match numeric values (with optional px) before the rgba part
      const s = String(raw);
      const rgbaMatch = s.match(
        /rgba\(\s*[\d.]+,\s*[\d.]+,\s*[\d.]+,\s*([\d.]+)\s*\)/,
      );
      if (!rgbaMatch) {
        console.warn(
          `Could not parse shadow "${raw}" for key "${k}", skipping`,
        );
        return [camel(k), null];
      }
      const opacity = parseFloat(rgbaMatch[1]);
      // Extract the numeric parts before rgba
      const beforeRgba = s.slice(0, s.indexOf("rgba")).trim();
      const nums = beforeRgba.match(/-?\d+/g);
      if (!nums || nums.length < 3) {
        console.warn(
          `Could not parse shadow offsets "${raw}" for key "${k}", skipping`,
        );
        return [camel(k), null];
      }
      return [
        camel(k),
        {
          offsetX: parseInt(nums[0], 10),
          offsetY: parseInt(nums[1], 10),
          radius: parseInt(nums[2], 10),
          opacity,
        },
      ];
    })
    .filter(([, v]) => v !== null);

  // letterSpacing: em → px (base 16px)
  const letterSpacingEntries = Object.entries(typo.font.letterSpacing)
    .filter(([k]) => !k.startsWith("$"))
    .map(([k, t]) => {
      const raw = String(val(t));
      const em = raw.match(/^(-?[\d.]+)em$/);
      if (em) return [camel(k), Math.round(parseFloat(em[1]) * 16 * 100) / 100];
      return [camel(k), parseFloat(raw) || 0];
    });

  // fontFamily: extract first family name from CSS font stack
  const fontFamilyEntries = Object.entries(typo.font.family)
    .filter(([k]) => !k.startsWith("$"))
    .map(([k, t]) => {
      const raw = String(val(t));
      // Extract first font name, stripping quotes
      let first = raw
        .split(",")[0]
        .trim()
        .replace(/^['"]|['"]$/g, "");
      // Map system-ui → System for RN
      if (first === "system-ui") first = "System";
      // Normalize key: instrument-sans → body
      const keyMap = { "instrument-sans": "body" };
      return [keyMap[k] ?? camel(k), first];
    });

  // large-text sizes from theme
  let sizeLEntries;
  let lineHeightLEntries;
  try {
    const lt = await readJSON("themes/large-text.json");
    const ltSizes = lt.theme.font.size;
    sizeLEntries = Object.entries(ltSizes)
      .filter(([k]) => !k.startsWith("$"))
      .map(([k, t]) => [camel(k), remToPx(val(t))]);

    // lineHeightL: large-text line heights (relaxed multiplier from large-text theme)
    const ltLineHeights = lt.theme.font.lineHeight;
    if (ltLineHeights) {
      lineHeightLEntries = Object.entries(ltLineHeights)
        .filter(([k]) => !k.startsWith("$"))
        .map(([k, t]) => [camel(k), parseFloat(val(t))]);
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      console.warn("themes/large-text.json not found, skipping sizeL");
      sizeLEntries = null;
      lineHeightLEntries = null;
    } else {
      throw err;
    }
  }

  let out = `// Auto-generated from design-tokens. DO NOT EDIT.
export const space = {
${toTSObject(spaceEntries)}
} as const;

export const size = {
${toTSObject(sizeEntries)}
} as const;
`;

  if (sizeLEntries) {
    out += `
export const sizeL = {
${toTSObject(sizeLEntries)}
} as const;
`;
  }

  out += `
export const radius = {
${toTSObject(radiusEntries)}
} as const;

export const zIndex = {
${toTSObject(zIndexEntries)}
} as const;

export const fontWeight = {
${toTSObject(weightEntries)}
} as const;

export const lineHeight = {
${toTSObject(lineHeightEntries)}
} as const;
`;

  if (lineHeightLEntries) {
    out += `
export const lineHeightL = {
${toTSObject(lineHeightLEntries)}
} as const;
`;
  }

  // borderWidth
  out += `
export const borderWidth = {
${toTSObject(borderWidthEntries)}
} as const;
`;

  // letterSpacing
  out += `
export const letterSpacing = {
${toTSObject(letterSpacingEntries)}
} as const;
`;

  // fontFamily
  out += `
export const fontFamily = {
${toTSObject(fontFamilyEntries)}
} as const;
`;

  // transition
  out += `
export const transition = {
${toTSObject(transitionEntries)}
} as const;
`;

  // shadow — needs special formatting (nested objects)
  const shadowLines = shadowEntries
    .map(([k, v]) => {
      return `  ${safeKey(k)}: { offsetX: ${v.offsetX}, offsetY: ${v.offsetY}, radius: ${v.radius}, opacity: ${v.opacity} },`;
    })
    .join("\n");
  out += `
export const shadow = {
${shadowLines}
} as const;
`;

  out += `
export type Space = typeof space;
export type Size = typeof size;${sizeLEntries ? "\nexport type SizeL = typeof sizeL;" : ""}
export type Radius = typeof radius;
export type ZIndex = typeof zIndex;
export type FontWeight = typeof fontWeight;
export type LineHeight = typeof lineHeight;${lineHeightLEntries ? "\nexport type LineHeightL = typeof lineHeightL;" : ""}
export type BorderWidth = typeof borderWidth;
export type LetterSpacing = typeof letterSpacing;
export type FontFamily = typeof fontFamily;
export type Transition = typeof transition;
export type Shadow = typeof shadow;
`;

  return out;
}

// ---------------------------------------------------------------------------
// colorModes.ts — light/dark semantic color mappings
// ---------------------------------------------------------------------------

/**
 * Resolve a token value from the flat light-mode sources.
 * Handles {reference} syntax by looking up in the token maps.
 */
function resolveRef(ref, colorMap, semanticMap, _seen = new Set()) {
  if (!ref || !ref.startsWith("{")) return ref;

  if (_seen.has(ref)) {
    console.warn(
      `Circular token reference detected: ${[..._seen, ref].join(" → ")}`,
    );
    return ref;
  }
  _seen.add(ref);

  const path = ref.slice(1, -1); // strip { }

  // Direct color.* references
  if (path.startsWith("color.")) {
    const rest = path.slice(6);
    const parts = rest.split(".");
    let cursor = colorMap.color;
    for (const p of parts) {
      if (!cursor) return ref;
      cursor = cursor[p];
    }
    return val(cursor);
  }

  // Semantic self-references like {foreground} → look in semantic map
  if (semanticMap[path]) {
    const resolved = val(semanticMap[path]);
    if (resolved && resolved.startsWith("{")) {
      return resolveRef(resolved, colorMap, semanticMap, _seen);
    }
    return resolved;
  }

  // Primitive token references like {borderWidth.default}
  return ref;
}

async function buildColorModes() {
  const colorData = await readJSON("tokens/colors.json");
  const semantic = await readJSON("tokens/semantic.json");
  const dark = await readJSON("themes/dark.json");

  const lightMap = buildLightColorMap(semantic, colorData);
  const darkMap = extractThemeColors(dark.theme);

  return `// Auto-generated from design-tokens. DO NOT EDIT.
export interface Colors {
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  accentPurple: string;
  accentMint: string;
  accentYellow: string;
  border: string;
  shadow: string;
  focusRing: string;
}

export const lightColors: Colors = {
${toTSObject(Object.entries(lightMap))}
};

export const darkColors: Colors = {
${toTSObject(Object.entries(darkMap))}
};

export const colorModes = {
  light: lightColors,
  dark: darkColors,
} as const;
`;
}

// ---------------------------------------------------------------------------
// narrative.ts — narrative arc tokens for light/dark + variants
// ---------------------------------------------------------------------------

async function buildNarrative() {
  const narrative = await readJSON("tokens/narrative.json");
  const dark = await readJSON("themes/dark.json");

  const baseNarrative = extractThemeNarrative(narrative);
  const darkNarrative = mergeNarrative(
    baseNarrative,
    extractThemeNarrative(dark.theme),
  );

  const variantFiles = [
    { file: "high-contrast", name: "highContrast" },
    { file: "dyslexia-friendly", name: "dyslexiaFriendly" },
    { file: "autism-friendly", name: "autismFriendly" },
    { file: "low-vision", name: "lowVision" },
    { file: "low-info", name: "lowInfo" },
  ];

  const variants = [];

  for (const { file, name } of variantFiles) {
    const data = await readJSON(`themes/${file}.json`);
    const merged = mergeNarrative(
      baseNarrative,
      extractThemeNarrative(data.theme),
    );
    const overrides = diffNarrative(baseNarrative, merged);
    if (Object.keys(overrides).length > 0) {
      variants.push({ name, overrides });
    }
  }

  let out = `// Auto-generated from design-tokens. DO NOT EDIT.
export interface Narrative {
  climb: { bg: string; text: string };
  drop: { bg: string; bgEnd: string; text: string; accent: string };
  stories: {
    bg: string;
    text: string;
    accent1: string;
    accent2: string;
    accent3: string;
    accent4: string;
    accentForeground: string;
  };
  relief: { bg: string; text: string; accent: string };
}

export type NarrativeOverride = Partial<{
  climb: Partial<Narrative["climb"]>;
  drop: Partial<Narrative["drop"]>;
  stories: Partial<Narrative["stories"]>;
  relief: Partial<Narrative["relief"]>;
}>;

export const lightNarrative: Narrative = ${JSON.stringify(baseNarrative, null, 2)};

export const darkNarrative: Narrative = ${JSON.stringify(darkNarrative, null, 2)};

export const narrativeModes = {
  light: lightNarrative,
  dark: darkNarrative,
} as const;

`;

  for (const { name, overrides } of variants) {
    out += `export const ${name}: NarrativeOverride = ${JSON.stringify(
      overrides,
      null,
      2,
    )};

`;
  }

  out += `export const narrativeVariants = {
${variants.map(({ name }) => `  ${name},`).join("\n")}
} as const;
`;

  return out;
}

// ---------------------------------------------------------------------------
// variants.ts — accessibility variant overrides (partial Colors)
// ---------------------------------------------------------------------------

async function buildVariants() {
  const colorData = await readJSON("tokens/colors.json");
  const semantic = await readJSON("tokens/semantic.json");

  const baseLightColors = buildLightColorMap(semantic, colorData);

  const variantFiles = [
    { file: "high-contrast", name: "highContrast" },
    { file: "dyslexia-friendly", name: "dyslexiaFriendly" },
    { file: "autism-friendly", name: "autismFriendly" },
    { file: "low-vision", name: "lowVision" },
    { file: "low-info", name: "lowInfo" },
  ];

  const variants = [];

  for (const { file, name } of variantFiles) {
    const data = await readJSON(`themes/${file}.json`);
    const themeColors = extractThemeColors(data.theme);

    // Only emit properties that differ from base light
    const overrides = {};
    for (const [key, value] of Object.entries(themeColors)) {
      if (value && value !== baseLightColors[key]) {
        overrides[key] = value;
      }
    }

    if (Object.keys(overrides).length > 0) {
      variants.push({ name, overrides });
    }
  }

  let out = `// Auto-generated from design-tokens. DO NOT EDIT.
import type { Colors } from './colorModes';

export type VariantOverride = Partial<Colors>;

`;

  for (const { name, overrides } of variants) {
    out += `export const ${name}: VariantOverride = {
${toTSObject(Object.entries(overrides))}
};

`;
  }

  out += `export const variants = {
${variants.map(({ name }) => `  ${name},`).join("\n")}
} as const;
`;

  return out;
}

// ---------------------------------------------------------------------------
// index.ts — barrel export
// ---------------------------------------------------------------------------

function buildIndex(hasSizeL, hasLineHeightL) {
  const valueExports = [
    "space",
    "size",
    ...(hasSizeL ? ["sizeL"] : []),
    "radius",
    "zIndex",
    "fontWeight",
    "lineHeight",
    ...(hasLineHeightL ? ["lineHeightL"] : []),
    "borderWidth",
    "letterSpacing",
    "fontFamily",
    "transition",
    "shadow",
  ].join(", ");

  const typeExports = [
    "Space",
    "Size",
    ...(hasSizeL ? ["SizeL"] : []),
    "Radius",
    "ZIndex",
    "FontWeight",
    "LineHeight",
    ...(hasLineHeightL ? ["LineHeightL"] : []),
    "BorderWidth",
    "LetterSpacing",
    "FontFamily",
    "Transition",
    "Shadow",
  ].join(", ");

  return `// Auto-generated from design-tokens. DO NOT EDIT.
export { palette } from './palette';
export type { Palette } from './palette';

export { ${valueExports} } from './tokens';
export type { ${typeExports} } from './tokens';

export { lightColors, darkColors, colorModes } from './colorModes';
export type { Colors } from './colorModes';

export { variants } from './variants';
export type { VariantOverride } from './variants';

export { lightNarrative, darkNarrative, narrativeModes, narrativeVariants } from './narrative';
export type { Narrative, NarrativeOverride } from './narrative';
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await mkdir(OUT, { recursive: true });

  const [palette, tokens, colorModes, variantsContent] = await Promise.all([
    buildPalette(),
    buildTokens(),
    buildColorModes(),
    buildVariants(),
  ]);
  const narrativeContent = await buildNarrative();

  const hasSizeL = tokens.includes("export const sizeL");
  const hasLineHeightL = tokens.includes("export const lineHeightL");

  await Promise.all([
    writeFile(join(OUT, "palette.ts"), palette),
    writeFile(join(OUT, "tokens.ts"), tokens),
    writeFile(join(OUT, "colorModes.ts"), colorModes),
    writeFile(join(OUT, "variants.ts"), variantsContent),
    writeFile(join(OUT, "narrative.ts"), narrativeContent),
    writeFile(join(OUT, "index.ts"), buildIndex(hasSizeL, hasLineHeightL)),
  ]);

  console.log(
    "Built build/unistyles/ with palette, tokens, colorModes, variants, narrative, index",
  );
}

main().catch((err) => {
  console.error("build-unistyles failed:", err);
  process.exit(1);
});
