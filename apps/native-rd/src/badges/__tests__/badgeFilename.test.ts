import { slugifyBadgeName } from "../badgeFilename";

describe("slugifyBadgeName", () => {
  it.each([
    ["Learn TypeScript", "Learn-TypeScript"],
    ["  trim me  ", "trim-me"],
    ["Read 3 books!!!", "Read-3-books"],
    ["a/b\\c:d*e", "a-b-c-d-e"],
    ["keep_underscores-and-dashes", "keep_underscores-and-dashes"],
    ["multiple    spaces", "multiple-spaces"],
  ])("slugifies %p to %p", (input, expected) => {
    expect(slugifyBadgeName(input)).toBe(expected);
  });

  it.each([
    ["", "empty string"],
    ["   ", "whitespace only"],
    ["🎉🎉🎉", "emoji only"],
    ["日本語", "non-Latin script"],
    [null, "null"],
    [undefined, "undefined"],
  ])("falls back to 'badge' for %p (%s)", (input, _label) => {
    expect(slugifyBadgeName(input)).toBe("badge");
  });

  it("caps the slug length and trims a trailing dash left by the cut", () => {
    const slug = slugifyBadgeName(
      "this is an extremely long badge title that should be truncated well before the end",
    );
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
  });
});
