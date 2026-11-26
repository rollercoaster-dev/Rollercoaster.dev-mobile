/**
 * Ban importing `Text` or `TextInput` from react-native outside their shared
 * wrappers.
 *
 * Shared `Text` (src/components/Text/) applies the theme's type ramp and the
 * type-scaling caps (#741); shared `TextField` (src/components/TextField/)
 * applies the body cap to inputs (#750). A raw RN `Text` or `TextInput` grows
 * without a cap under Dynamic Type. Type-only imports (`type TextInput` for a
 * ref) render nothing and stay allowed. Stories and tests are exempt through a
 * `files` override in eslint.config.js, not here.
 */
const BANNED = {
  Text: { exemptDir: "/components/Text/", messageId: "noNativeText" },
  TextInput: {
    exemptDir: "/components/TextField/",
    messageId: "noNativeTextInput",
  },
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow importing Text or TextInput from react-native; use the shared Text or TextField component",
    },
    messages: {
      noNativeText: [
        "Import Text from src/components/Text, not from react-native. ",
        "Shared Text applies the theme's type ramp and the type-scaling caps ",
        "(docs/accessibility-guidelines.md#text-scaling). Pick the variant that ",
        "matches the text's role and keep local style overrides.",
      ].join(""),
      noNativeTextInput: [
        "Import TextField from src/components/TextField, not TextInput from ",
        "react-native. TextField applies the body type-scaling cap ",
        "(docs/accessibility-guidelines.md#text-scaling) and passes every other ",
        "prop through. Use `import { type TextInput }` for refs.",
      ].join(""),
    },
    schema: [],
  },

  create(context) {
    const filename = (context.filename || context.getFilename()).replace(
      /\\/g,
      "/",
    );
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
        const banned = Object.prototype.hasOwnProperty.call(BANNED, name)
          ? BANNED[name]
          : null;
        if (banned && !filename.includes(banned.exemptDir)) {
          context.report({ node: specifier, messageId: banned.messageId });
        }
      }
    }

    return {
      ImportDeclaration: checkSpecifiers,
      ExportNamedDeclaration: checkSpecifiers,
    };
  },
};
