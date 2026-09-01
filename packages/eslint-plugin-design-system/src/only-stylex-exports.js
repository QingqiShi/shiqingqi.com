"use strict";

const { isStylexCall } = require("./is-stylex-call");

/** @type {import("eslint").Rule.RuleModule} */
const onlyStylexExports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require every `export const` in a StyleX module to be a `stylex.*` construct",
    },
    messages: {
      notStylexConstruct:
        "`{{name}}` is exported from a StyleX module but is not a `stylex.*` construct. StyleX resolves a member reference across a module boundary only for its own constructs, so a foreign call site composing this value compiles to nothing and StyleX drops the whole declaration with no error.",
    },
    schema: [],
  },

  create(context) {
    return {
      ExportNamedDeclaration(node) {
        const declaration = node.declaration;
        if (
          declaration == null ||
          declaration.type !== "VariableDeclaration" ||
          declaration.kind !== "const"
        ) {
          return;
        }
        for (const declarator of declaration.declarations) {
          if (isStylexCall(declarator.init)) continue;
          const id = declarator.id;
          const name =
            id.type === "Identifier" ? id.name : context.sourceCode.getText(id);
          context.report({
            node: declarator,
            messageId: "notStylexConstruct",
            data: { name },
          });
        }
      },
    };
  },
};

module.exports = onlyStylexExports;
