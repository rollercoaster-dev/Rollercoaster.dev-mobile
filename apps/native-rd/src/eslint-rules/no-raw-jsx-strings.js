/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow raw user-visible strings as JSX text children in screens/ and components/ — use t() instead",
    },
    messages: {
      noRawJsxString: [
        "Raw string '{{ value }}' found as JSX text. ",
        'User-visible copy must go through i18n: wrap it in t("namespace.key"). ',
        "Docs: docs/i18n.md. ",
        "If this is genuinely not display copy (e.g. an icon glyph), ",
        "add // eslint-disable-next-line local/no-raw-jsx-strings with a justification.",
      ].join(""),
    },
    schema: [],
  },

  create(context) {
    const filename = (context.filename || context.getFilename()).replace(
      /\\/g,
      "/",
    );

    // Only enforce in screens and components — the surfaces that ship to users.
    if (!filename.includes("/screens/") && !filename.includes("/components/")) {
      return {};
    }

    // Stories and tests are fixture data, not production copy.
    if (
      filename.endsWith(".stories.ts") ||
      filename.endsWith(".stories.tsx") ||
      filename.endsWith(".test.ts") ||
      filename.endsWith(".test.tsx")
    ) {
      return {};
    }

    // Numeric-only text (optionally with separators) is not translatable copy.
    const NUMERIC_PATTERN = /^\d[\d\s.,]*$/;

    function isAllowed(trimmed) {
      // Whitespace-only JSXText (indentation between elements).
      if (trimmed.length === 0) return true;
      // Single character: punctuation, separators (·, /, |), or an icon glyph.
      if ([...trimmed].length === 1) return true;
      // Pure numbers, e.g. "42" or "1,000".
      if (NUMERIC_PATTERN.test(trimmed)) return true;
      // All non-ASCII: icon font ligatures / glyph strings, never display copy.
      if ([...trimmed].every((ch) => ch.codePointAt(0) > 127)) return true;
      return false;
    }

    return {
      JSXText(node) {
        const trimmed = node.value.trim();
        if (isAllowed(trimmed)) return;
        context.report({
          node,
          messageId: "noRawJsxString",
          data: { value: trimmed },
        });
      },
    };
  },
};
