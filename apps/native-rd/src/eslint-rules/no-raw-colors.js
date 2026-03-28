/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow raw color values in style files — use theme tokens instead',
    },
    messages: {
      noRawColor: [
        "Raw color '{{ value }}' found in style. ",
        'Use a theme token instead: theme.colors.* from react-native-unistyles. ',
        'Docs: docs/design/nd-themes.md. ',
        'If this is an intentional exception (e.g. tested contrast ratio), ',
        'add // eslint-disable-next-line local/no-raw-colors with a justification comment.',
      ].join(''),
    },
    schema: [],
  },

  create(context) {
    const filename = (context.filename || context.getFilename()).replace(/\\/g, '/');
    // Only enforce in component style files — screens may have justified raw
    // colors (e.g. media overlays). Expand scope as violations are cleaned up.
    const isStyleFile = filename.endsWith('.styles.ts') || filename.endsWith('.styles.tsx');
    const isComponentFile = filename.includes('/components/');
    if (!isStyleFile || !isComponentFile) {
      return {};
    }

    const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
    const COLOR_FUNC_PATTERN = /^(?:rgba?|hsla?)\(/i;
    // CSS named colors that are NOT semantic RN values
    const NAMED_COLORS = new Set([
      'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
      'pink', 'grey', 'gray', 'brown', 'cyan', 'magenta', 'navy', 'teal',
      'coral', 'salmon', 'ivory', 'beige', 'maroon', 'olive', 'aqua',
      'fuchsia', 'lime', 'silver', 'gold', 'indigo', 'violet', 'crimson',
    ]);
    // RN values that are semantic, not visual colors
    const ALLOWED = new Set(['transparent', 'inherit']);

    function isRawColor(val) {
      if (HEX_PATTERN.test(val)) return true;
      if (COLOR_FUNC_PATTERN.test(val)) return true;
      if (NAMED_COLORS.has(val.toLowerCase()) && !ALLOWED.has(val.toLowerCase())) return true;
      return false;
    }

    return {
      Literal(node) {
        if (typeof node.value !== 'string') return;
        const val = node.value.trim();
        if (isRawColor(val)) {
          context.report({ node, messageId: 'noRawColor', data: { value: node.value } });
        }
      },
      TemplateLiteral(node) {
        node.quasis.forEach((quasi) => {
          const raw = quasi.value.raw.trim();
          if (isRawColor(raw)) {
            context.report({ node, messageId: 'noRawColor', data: { value: quasi.value.raw } });
          }
        });
      },
    };
  },
};
