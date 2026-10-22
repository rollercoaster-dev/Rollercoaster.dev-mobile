import { readFileSync } from "fs";
import { join } from "path";
import { themes } from "../../themes";

/**
 * Storybook web is the reference preview for design review, and it can only
 * show a theme's typography if the browser can load that theme's font. Until
 * #697 the four Lexend `.woff2` files under public/fonts were saved 404 pages,
 * so Warm Studio silently previewed in a fallback font. This checks each
 * declared @font-face against the bytes on disk, and that every font family a
 * product theme renders with is declared.
 */
const APP_ROOT = join(__dirname, "../../..");
const PREVIEW_PATH = join(APP_ROOT, ".storybook-web/preview.tsx");

type FontFace = { family: string; weight: number; url: string };

function readFontFaces(): FontFace[] {
  const preview = readFileSync(PREVIEW_PATH, "utf8");
  const pattern =
    /@font-face \{ font-family: '([^']+)'; font-weight: (\d+);[^}]*url\('\.\/([^']+)'\)/g;
  return [...preview.matchAll(pattern)].map(([, family, weight, url]) => ({
    family,
    weight: Number(weight),
    url,
  }));
}

// woff2, woff, TrueType, OpenType (CFF)
const FONT_SIGNATURES = ["774f4632", "774f4646", "00010000", "4f54544f"];

describe("Storybook web font faces", () => {
  const faces = readFontFaces();

  it("parses every declared font face", () => {
    // A face written in another shape would otherwise skip the byte check.
    const declared = readFileSync(PREVIEW_PATH, "utf8").match(/@font-face/g);
    expect(faces.length).toBeGreaterThan(0);
    expect(faces).toHaveLength(declared?.length ?? 0);
  });

  it.each(faces.map((face) => [face.url, face]))(
    "%s is a real font file",
    (_url, face) => {
      const bytes = readFileSync(join(APP_ROOT, "public", face.url));
      expect(FONT_SIGNATURES).toContain(bytes.subarray(0, 4).toString("hex"));
    },
  );

  const themeFamilies = [
    ...new Set(
      Object.values(themes).flatMap((theme) => [
        theme.fontFamily.body,
        theme.fontFamily.headline,
        theme.fontFamily.mono,
      ]),
    ),
  ];

  const headlineFamilies = [
    ...new Set(Object.values(themes).map((theme) => theme.fontFamily.headline)),
  ];

  it.each(headlineFamilies)("declares a bold face for %s", (family) => {
    expect(faces).toContainEqual(
      expect.objectContaining({ family, weight: 700 }),
    );
  });

  it.each(themeFamilies)("declares a regular face for %s", (family) => {
    expect(faces).toContainEqual(
      expect.objectContaining({ family, weight: 400 }),
    );
  });
});
