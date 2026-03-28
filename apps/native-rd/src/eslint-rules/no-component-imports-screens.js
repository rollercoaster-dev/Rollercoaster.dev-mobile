/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow components and utils from importing screens — enforces dependency direction',
    },
    messages: {
      noScreenImport: [
        "Import '{{ path }}' crosses an architectural boundary. ",
        'Files in src/components/ and src/utils/ must not import from src/screens/. ',
        'If you need shared logic, extract it to src/utils/ or src/hooks/. ',
        "See AGENTS.md 'Architectural Rules' for the dependency direction.",
      ].join(''),
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    const normalized = filename.replace(/\\/g, '/');
    if (!normalized.includes('/components/') && !normalized.includes('/utils/')) {
      return {};
    }

    function check(node, importPath) {
      if (typeof importPath !== 'string') return;
      const isRelativeScreenImport =
        importPath.startsWith('.') &&
        /(?:^|[/\\])screens(?:[/\\]|$)/.test(importPath);
      // Also catch path-alias imports (tsconfig @/* → src/*)
      const isAliasScreenImport =
        importPath.startsWith('@/screens') || importPath.startsWith('src/screens');
      if (isRelativeScreenImport || isAliasScreenImport) {
        context.report({ node, messageId: 'noScreenImport', data: { path: importPath } });
      }
    }

    return {
      ImportDeclaration(node) {
        check(node, node.source.value);
      },
      CallExpression(node) {
        if (node.callee.name === 'require' && node.arguments.length > 0 && node.arguments[0].type === 'Literal') {
          check(node, node.arguments[0].value);
        }
      },
    };
  },
};
