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
        "If this is genuinely not display copy (e.g. an icon glyph), add a ",
        "disable comment with a justification — inside JSX use the block form ",
        "{/* eslint-disable-next-line local/no-raw-jsx-strings */}; ",
        "in plain JS use // eslint-disable-next-line local/no-raw-jsx-strings.",
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

    // Numeric-only text (optionally with grouping/decimal separators).
    const NUMERIC_PATTERN = /^\d[\d\s.,]*$/;

    function isAllowed(trimmed) {
      // Whitespace-only (indentation between elements).
      if (trimmed.length === 0) return true;
      // Pure numbers, e.g. "42" or "1,000.50".
      if (NUMERIC_PATTERN.test(trimmed)) return true;
      // No letters AND no digits → punctuation, separators (·, /, |, …, → ←), or
      // icon-font glyphs (emoji, dingbats, Private Use Area). Never translatable
      // copy. Letters in ANY script (Latin, CJK, Cyrillic, …) and number+unit
      // strings like "100%" contain \p{L}/\p{N} and fall through to be flagged.
      if (!/[\p{L}\p{N}]/u.test(trimmed)) return true;
      return false;
    }

    function reportIfRaw(reportNode, raw) {
      const trimmed = raw.trim();
      if (isAllowed(trimmed)) return;
      context.report({
        node: reportNode,
        messageId: "noRawJsxString",
        data: { value: trimmed },
      });
    }

    return {
      JSXText(node) {
        reportIfRaw(node, node.value);
      },
      // Catch the {"literal"} bypass: a string literal used as a JSX *child*
      // (parent is the element/fragment), not as a prop value (parent is a
      // JSXAttribute, e.g. label={"Go Back"} — out of scope).
      JSXExpressionContainer(node) {
        const parentType = node.parent && node.parent.type;
        if (parentType !== "JSXElement" && parentType !== "JSXFragment") return;
        const expr = node.expression;
        if (expr.type !== "Literal" || typeof expr.value !== "string") return;
        reportIfRaw(expr, expr.value);
      },
    };
  },
};
