/**
 * Rail bleed invariant.
 *
 * Every horizontal option rail (shape / frame / color / center mode, plus the
 * per-channel swatch rail) lives inside a CollapsibleSection, whose content is
 * inset horizontally. With that inset on the scroll *viewport*, the last option
 * is clipped against a hard gutter and the rail reads as truncated instead of
 * scrollable — the review finding this guards.
 *
 * The fix is a pair that must stay balanced: a negative margin on the
 * ScrollView cancelling the section inset, and the same value re-applied as
 * content padding so cells still line up with the section title. Asserting the
 * relationship (not the literal number) keeps a spacing-token change from
 * silently reintroducing the gutter.
 */
import { styles as sectionStyles } from "../../components/CollapsibleSection/CollapsibleSection.styles";
import { styles as colorsAccordionStyles } from "../BadgeColorsAccordion.styles";
import { selectorStyles } from "../selectorStyles";

describe("selector rail bleed", () => {
  const sectionInset = sectionStyles.content.paddingHorizontal as number;

  it("cancels exactly the section's horizontal inset", () => {
    expect(selectorStyles.rail.marginHorizontal).toBe(-sectionInset);
    expect(colorsAccordionStyles.paletteRail.marginHorizontal).toBe(
      -sectionInset,
    );
  });

  it("re-applies that inset as rail content padding", () => {
    expect(selectorStyles.row.paddingHorizontal).toBe(sectionInset);
    expect(colorsAccordionStyles.paletteRow.paddingHorizontal).toBe(
      sectionInset,
    );
  });
});
