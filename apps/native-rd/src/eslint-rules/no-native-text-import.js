/**
 * Ban importing `Text` from react-native outside the shared Text component.
 *
 * Shared `Text` (src/components/Text/) applies the theme's type ramp and the
 * type-scaling caps (#741). A raw RN `Text` skips both, so it grows without a
 * cap under Dynamic Type and ignores theme fonts. Stories and tests are exempt
 * through a `files` override in eslint.config.js, not here.
 */
const EXEMPT_DIR = "/components/Text/";

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow importing Text from react-native; use the shared Text component",
    },
    messages: {
      noNativeText: [
        "Import Text from src/components/Text, not from react-native. ",
        "Shared Text applies the theme's type ramp and the type-scaling caps ",
        "(docs/accessibility-guidelines.md#text-scaling). Pick the variant that ",
        "matches the text's role and keep local style overrides.",
      ].join(""),
    },
    schema: [],
  },

  create(context) {
    const filename = (context.filename || context.getFilename()).replace(
      /\\/g,
      "/",
    );
    if (filename.includes(EXEMPT_DIR)) return {};

    function checkSpecifiers(node) {
      if (!node.source || node.source.value !== "react-native") return;
      // `import type { Text }` / `export type { Text }` render nothing.
      if (node.importKind === "type" || node.exportKind === "type") return;
      for (const specifier of node.specifiers) {
        if (specifier.importKind === "type" || specifier.exportKind === "type")
          continue;
        const imported =
          specifier.type === "ImportSpecifier"
            ? specifier.imported
            : specifier.type === "ExportSpecifier"
              ? specifier.local
              : null;
        if (!imported) continue;
        const name =
          imported.type === "Literal" ? imported.value : imported.name;
        if (name === "Text") {
          context.report({ node: specifier, messageId: "noNativeText" });
        }
      }
    }

    return {
      ImportDeclaration: checkSpecifiers,
      ExportNamedDeclaration: checkSpecifiers,
    };
  },
};
