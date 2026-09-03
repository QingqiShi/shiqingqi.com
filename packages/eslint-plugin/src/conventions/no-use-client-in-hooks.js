/**
 * ESLint rule: no-use-client-in-hooks
 *
 * The `"use client"` directive marks a seam between server code and client
 * code. A hook can run only inside a client component. So a module that
 * exports only hooks is never a seam, and the directive there does
 * nothing.
 *
 * The rule finds the directive in the directive prologue: the leading
 * string-literal statements at the top of the file. It then asks whether
 * the module is a hook module: the test lives in `@tuja/module-exports`.
 *
 * The rule reports the directive only when the module has at least one
 * value export and every value export is a hook. An `export * from` makes
 * a barrel that the rule cannot judge, so it skips the file. A module with
 * no value exports also passes.
 *
 * The fix removes the directive statement and the blank space after it, so
 * the file starts at the next statement.
 */

"use strict";

const { isHookModule, valueExportNamesOf } = require("@tuja/module-exports");
const {
  removeWithTrailingWhitespace,
} = require("./remove-with-trailing-whitespace");

/** @type {import("eslint").Rule.RuleModule} */
const noUseClientInHooks = {
  meta: {
    type: "suggestion",
    docs: {
      description: 'Forbid "use client" in a module that exports only hooks',
    },
    fixable: "code",
    messages: {
      notASeam:
        '"use client" does nothing here: this module exports only hooks ({{exports}}), and a hook can only run inside a client component, so the module is never a server/client seam. Remove the directive.',
    },
    schema: [],
  },

  create(context) {
    return {
      "Program:exit"(program) {
        let directiveNode;
        for (const node of program.body) {
          if (
            node.type !== "ExpressionStatement" ||
            typeof node.directive !== "string"
          ) {
            break;
          }
          if (node.directive === "use client") {
            directiveNode = node;
            break;
          }
        }
        if (!directiveNode) return;

        if (!isHookModule(program)) return;

        context.report({
          node: directiveNode,
          messageId: "notASeam",
          data: { exports: valueExportNamesOf(program).join(", ") },
          fix(fixer) {
            return removeWithTrailingWhitespace(
              fixer,
              context.sourceCode,
              directiveNode,
            );
          },
        });
      },
    };
  },
};

module.exports = noUseClientInHooks;
