/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Screen files should use shared components instead of reimplementing them inline',
    },
    messages: {
      useSharedComponent: [
        "Possible reimplementation of shared component '{{ component }}' detected. ",
        'Screen files should import from src/components/ instead of building inline look-alikes. ',
        'If this is intentional, add // eslint-disable-next-line local/no-shared-component-reimplementation.',
      ].join(''),
    },
    schema: [],
  },

  create(context) {
    const filename = (context.filename || context.getFilename()).replace(
      /\\/g,
      '/'
    );
    if (!filename.includes('/screens/')) return {};

    // Patterns that suggest reimplementation of shared components.
    // Each entry: [component name, required prop patterns on a Pressable/TouchableOpacity/View]
    // Only flag elements with very distinctive prop combos to avoid noise.
    // View-based signatures (Card) are intentionally omitted — too many
    // legitimate uses of <View accessibilityRole onPress> in screens.
    const COMPONENT_SIGNATURES = [
      {
        name: 'Button',
        element: /^(?:Pressable|TouchableOpacity)$/,
        // Require style + all three a11y props — a proper interactive element
        // has these WCAG props, but a Button reimplementation also styles itself.
        requiredProps: ['onPress', 'accessibilityRole', 'accessibilityLabel', 'style'],
        minProps: 4,
      },
      {
        name: 'Input',
        element: /^TextInput$/,
        requiredProps: ['onChangeText', 'value', 'accessibilityLabel', 'style'],
        minProps: 4,
      },
    ];

    return {
      JSXOpeningElement(node) {
        const elName =
          node.name.type === 'JSXIdentifier' ? node.name.name : null;
        if (!elName) return;

        for (const sig of COMPONENT_SIGNATURES) {
          if (!sig.element.test(elName)) continue;

          const propNames = node.attributes
            .filter((a) => a.type === 'JSXAttribute' && a.name?.type === 'JSXIdentifier')
            .map((a) => a.name.name);

          const matchCount = sig.requiredProps.filter((p) =>
            propNames.includes(p)
          ).length;

          if (matchCount >= sig.minProps) {
            context.report({
              node,
              messageId: 'useSharedComponent',
              data: { component: sig.name },
            });
          }
        }
      },
    };
  },
};
