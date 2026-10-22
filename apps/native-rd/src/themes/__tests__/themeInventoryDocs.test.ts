import { readFileSync } from "fs";
import { join } from "path";
import { themeOptions } from "../../hooks/useTheme";
import common from "../../i18n/resources/en/common.json";
import { themes, type ComposedTheme, type ThemeName } from "../compose";
import { sizeL, lineHeightL } from "../tokens";

/**
 * docs/design/nd-themes.md is the one theme inventory contributors read. Its
 * table used to be hand-maintained and drifted to "14 themes" with the wrong
 * fonts (#697). This pins every row to the composed runtime theme, so adding,
 * removing, renaming, or re-fonting a theme fails here until the doc follows.
 */
const DOC_PATH = join(__dirname, "../../../docs/design/nd-themes.md");

type InventoryRow = {
  id: string;
  name: string;
  purpose: string;
  bodyFont: string;
  headlineFont: string;
  sizeScale: string;
  lineHeight: string;
  elevation: string;
};

function readInventoryRows(): InventoryRow[] {
  const doc = readFileSync(DOC_PATH, "utf8");
  const start = doc.indexOf("<!-- theme-inventory:start -->");
  const end = doc.indexOf("<!-- theme-inventory:end -->");
  if (start === -1 || end === -1) {
    throw new Error("nd-themes.md is missing its theme-inventory markers");
  }
  return doc
    .slice(start, end)
    .split("\n")
    .filter((line) => line.startsWith("| `"))
    .map((line) => {
      const [
        id,
        name,
        purpose,
        bodyFont,
        headlineFont,
        sizeScale,
        lineHeight,
        elevation,
      ] = line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim());
      return {
        id: id.replace(/`/g, ""),
        name,
        purpose,
        bodyFont,
        headlineFont,
        sizeScale,
        lineHeight,
        elevation,
      };
    });
}

function elevationOf(theme: ComposedTheme): string {
  const card = theme.shadow.cardElevation;
  if (card.opacity * theme.shadows.opacity === 0) return "None — borders only";
  if (card.radius > 0) return "Soft low shadows";
  if (card.offsetX === 0) return `${card.offsetY}pt drop cutout`;
  return "Hard offset shadows";
}

function expectedRow(id: ThemeName): InventoryRow {
  const theme = themes[id];
  const copy = common.theme.options[id];
  return {
    id,
    name: copy.label,
    purpose: copy.description,
    bodyFont: theme.fontFamily.body,
    headlineFont: theme.fontFamily.headline,
    sizeScale: theme.size === sizeL ? "`sizeL` (1.25×)" : "`size`",
    lineHeight:
      theme.lineHeight === lineHeightL ? "`lineHeightL`" : "`lineHeight`",
    elevation: elevationOf(theme),
  };
}

describe("nd-themes.md theme inventory", () => {
  const rows = readInventoryRows();

  it("lists exactly the product themes, in picker order", () => {
    expect(rows.map((row) => row.id)).toEqual(themeOptions.map((o) => o.id));
  });

  it.each(themeOptions.map((o) => o.id))(
    "documents %s as it composes at runtime",
    (id) => {
      expect(rows.find((row) => row.id === id)).toEqual(expectedRow(id));
    },
  );
});
