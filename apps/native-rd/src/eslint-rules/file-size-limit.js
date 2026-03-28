/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Warn when a source file exceeds 300 lines',
    },
    messages: {
      fileTooLarge: [
        'File is {{ lines }} lines (max: 300). ',
        'Large files reduce agent output quality and make focused changes harder. ',
        'Consider splitting into smaller single-responsibility modules. ',
        'See docs/plans/2026-02-24-agent-first-vision.md Layer 2.',
      ].join(''),
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    const normalized = filename.replace(/\\/g, '/');

    // Skip test and story files — they may legitimately be long
    if (
      normalized.endsWith('.test.ts') ||
      normalized.endsWith('.test.tsx') ||
      normalized.endsWith('.stories.ts') ||
      normalized.endsWith('.stories.tsx')
    ) {
      return {};
    }

    return {
      Program(node) {
        const source = context.sourceCode || context.getSourceCode();
        const lines = source.lines ? source.lines.length : source.getText().split('\n').length;
        if (lines > 300) {
          context.report({
            node,
            messageId: 'fileTooLarge',
            data: { lines: String(lines) },
          });
        }
      },
    };
  },
};
