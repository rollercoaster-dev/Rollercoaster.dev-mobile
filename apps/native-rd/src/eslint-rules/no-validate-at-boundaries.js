/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Exported functions in utils/ and hooks/ should validate inputs at the boundary',
    },
    messages: {
      missingGuard: [
        "Exported function '{{ name }}' has no input guard. ",
        'Boundary functions (utils, hooks) should validate their inputs ',
        'with an early return, throw, or type guard as the first statement. ',
        'See docs/architecture/ for boundary conventions.',
      ].join(''),
    },
    schema: [],
  },

  create(context) {
    const filename = (context.filename || context.getFilename()).replace(
      /\\/g,
      '/'
    );
    const isBoundary =
      filename.includes('/utils/') || filename.includes('/hooks/');
    if (!isBoundary) return {};

    function isGuardStatement(stmt) {
      if (!stmt) return false;
      // if (...) { return / throw } — must contain an early exit to count as a guard
      if (stmt.type === 'IfStatement') {
        const consequent = stmt.consequent;
        if (consequent.type === 'ReturnStatement' || consequent.type === 'ThrowStatement') return true;
        if (consequent.type === 'BlockStatement') {
          return consequent.body.some(
            (s) => s.type === 'ReturnStatement' || s.type === 'ThrowStatement'
          );
        }
        return false;
      }
      // throw ...
      if (stmt.type === 'ThrowStatement') return true;
      // assert / invariant calls
      if (
        stmt.type === 'ExpressionStatement' &&
        stmt.expression.type === 'CallExpression'
      ) {
        const callee = stmt.expression.callee;
        if (callee.type === 'Identifier' && /assert|invariant/i.test(callee.name))
          return true;
      }
      return false;
    }

    function checkFunction(node, name) {
      const body = node.body;
      if (!body || body.type !== 'BlockStatement') return;
      // Skip parameterless functions — nothing to validate
      if (!node.params || node.params.length === 0) return;
      // Skip functions where all params have defaults or are optional — guards unnecessary
      const allOptional = node.params.every(
        (p) => p.type === 'AssignmentPattern' || p.optional
      );
      if (allOptional) return;
      const first = body.body[0];
      if (!isGuardStatement(first)) {
        context.report({ node, messageId: 'missingGuard', data: { name } });
      }
    }

    return {
      ExportNamedDeclaration(node) {
        const decl = node.declaration;
        if (!decl) return;
        if (decl.type === 'FunctionDeclaration' && decl.id) {
          checkFunction(decl, decl.id.name);
        }
        if (decl.type === 'VariableDeclaration') {
          for (const d of decl.declarations) {
            if (
              d.init &&
              (d.init.type === 'ArrowFunctionExpression' ||
                d.init.type === 'FunctionExpression') &&
              d.id &&
              d.id.name
            ) {
              checkFunction(d.init, d.id.name);
            }
          }
        }
      },

      'ExportDefaultDeclaration > FunctionDeclaration'(node) {
        checkFunction(node, node.id ? node.id.name : 'default');
      },

      'ExportDefaultDeclaration > ArrowFunctionExpression'(node) {
        checkFunction(node, 'default');
      },
    };
  },
};
