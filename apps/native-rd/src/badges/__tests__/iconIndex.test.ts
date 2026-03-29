/**
 * Tests for the badge icon search index
 *
 * Verifies keyword search, category filtering, and icon name formatting.
 */

import {
  searchIcons,
  getIconsByCategory,
  getAllCuratedIcons,
  iconNameToLabel,
  POPULAR_ICON_NAMES,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
} from "../iconIndex";

describe("iconIndex", () => {
  describe("searchIcons", () => {
    it("returns popular icons for empty query", () => {
      const results = searchIcons("");
      expect(results).toEqual(POPULAR_ICON_NAMES);
      expect(results.length).toBeGreaterThan(0);
    });

    it("returns popular icons for whitespace-only query", () => {
      expect(searchIcons("   ")).toEqual(POPULAR_ICON_NAMES);
    });

    it("finds icons by exact keyword", () => {
      const results = searchIcons("trophy");
      expect(results).toContain("Trophy");
    });

    it("supports prefix matching", () => {
      const results = searchIcons("tro");
      expect(results).toContain("Trophy");
    });

    it("matches multiple keywords with higher relevance", () => {
      const results = searchIcons("git branch");
      expect(results[0]).toBe("GitBranch");
    });

    it("is case-insensitive", () => {
      const results = searchIcons("TROPHY");
      expect(results).toContain("Trophy");
    });

    it("returns empty array for nonsense query", () => {
      const results = searchIcons("xyzzyplugh");
      expect(results).toHaveLength(0);
    });

    it("finds icons across categories", () => {
      const results = searchIcons("code");
      expect(results).toContain("Code");
      expect(results).toContain("CodeBlock");
    });

    it("finds icons by semantic keyword not in name", () => {
      // "software" is a keyword for Code but not in the name
      const results = searchIcons("software");
      expect(results).toContain("Code");
    });
  });

  describe("getIconsByCategory", () => {
    it("returns icons for achievement category", () => {
      const icons = getIconsByCategory("achievement");
      expect(icons).toContain("Trophy");
      expect(icons).toContain("Medal");
      expect(icons.length).toBeGreaterThan(5);
    });

    it("returns icons sorted alphabetically", () => {
      const icons = getIconsByCategory("learning");
      const sorted = [...icons].sort();
      expect(icons).toEqual(sorted);
    });

    it("returns icons for each defined category", () => {
      for (const category of CATEGORY_ORDER) {
        const icons = getIconsByCategory(category);
        expect(icons.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getAllCuratedIcons", () => {
    it("returns all curated icons", () => {
      const all = getAllCuratedIcons();
      expect(all.length).toBeGreaterThan(100);
    });

    it("includes icons from multiple categories", () => {
      const all = getAllCuratedIcons();
      expect(all).toContain("Trophy"); // achievement
      expect(all).toContain("Code"); // coding
      expect(all).toContain("Heart"); // health
      expect(all).toContain("Book"); // learning
    });
  });

  describe("iconNameToLabel", () => {
    test.each([
      ["Trophy", "Trophy"],
      ["GitPullRequest", "Git Pull Request"],
      ["ChartLineUp", "Chart Line Up"],
      ["Code", "Code"],
      ["SealCheck", "Seal Check"],
    ])('formats "%s" as "%s"', (input, expected) => {
      expect(iconNameToLabel(input)).toBe(expected);
    });
  });

  describe("CATEGORY_LABELS", () => {
    it("has a label for every category in CATEGORY_ORDER", () => {
      for (const category of CATEGORY_ORDER) {
        expect(CATEGORY_LABELS[category]).toBeDefined();
        expect(typeof CATEGORY_LABELS[category]).toBe("string");
      }
    });
  });

  describe("POPULAR_ICON_NAMES", () => {
    it("contains well-known badge icons", () => {
      expect(POPULAR_ICON_NAMES).toContain("Trophy");
      expect(POPULAR_ICON_NAMES).toContain("Star");
    });

    it("has a reasonable count for quick-access display", () => {
      // Should be enough to fill a row or two but not overwhelming
      expect(POPULAR_ICON_NAMES.length).toBeGreaterThanOrEqual(10);
      expect(POPULAR_ICON_NAMES.length).toBeLessThanOrEqual(30);
    });
  });
});
