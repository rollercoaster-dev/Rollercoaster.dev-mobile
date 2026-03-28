const fs = require('fs');
const path = require('path');

// Module-level cache avoids repeated fs.existsSync for the same directory.
// Trade-off: in watch/IDE mode this persists for the process lifetime, so adding
// an index.ts mid-session won't clear the error until ESLint restarts. This is
// acceptable — the error surfaces on next lint run or CI.
const _barrelCache = new Map();

function hasBarrelFile(dir) {
  if (_barrelCache.has(dir)) return _barrelCache.get(dir);
  try {
    const result =
      fs.existsSync(path.join(dir, 'index.ts')) ||
      fs.existsSync(path.join(dir, 'index.tsx'));
    _barrelCache.set(dir, result);
    return result;
  } catch {
    // Intentional silent skip: if fs throws (EACCES, ENAMETOOLONG), treat as
    // "has barrel" so the lint run continues. A missing barrel will still be
    // caught by the structural test in CI.
    _barrelCache.set(dir, true);
    return true;
  }
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Every component directory under src/components/ must have an index.ts barrel export',
    },
    messages: {
      missingBarrel: [
        "Component directory '{{ dir }}' is missing an index.ts barrel export. ",
        'Create src/components/{{ dir }}/index.ts that re-exports the component. ',
        'This ensures consistent import paths across the codebase.',
      ].join(''),
    },
    schema: [],
  },

  create(context) {
    const filename = (context.filename || context.getFilename()).replace(
      /\\/g,
      '/'
    );

    // Only run on files directly inside a component directory
    const match = filename.match(/\/src\/components\/([^/]+)\//);
    if (!match) return {};

    const componentName = match[1];
    // Skip non-component directories (e.g., __tests__, shared)
    if (componentName.startsWith('__') || componentName === 'shared')
      return {};

    const idx = filename.indexOf(`/src/components/${componentName}/`);
    if (idx === -1) return {};

    const componentDir = filename.substring(
      0,
      idx + `/src/components/${componentName}`.length
    );

    if (!hasBarrelFile(componentDir)) {
      return {
        Program(node) {
          context.report({
            node,
            messageId: 'missingBarrel',
            data: { dir: componentName },
          });
        },
      };
    }

    return {};
  },
};
