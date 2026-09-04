/**
 * ESLint rule: no-single-use-literal-alias
 *
 * A type alias whose body is only literal types — `type Tone = "default"
 * | "muted"` — names a set of values. But when the file uses the alias
 * exactly once, the one use site already names that set: the prop or
 * parameter it annotates. The alias then holds no shared truth; it only
 * moves the values away from the reader, who must scroll to the
 * definition and back.
 *
 * The rule reports a type alias when all of these hold:
 * - the body is a literal type, or a union of literal types (`null` and
 *   `undefined` may ride along as union members),
 * - the alias is not exported,
 * - the alias has no type parameters, and
 * - the file references it exactly once, through a plain type reference.
 *
 * Zero references is the unused-vars rules' territory. Two or more
 * references make the alias a single source of truth, which earns the
 * name. A template literal type with interpolations parses as its own
 * node type (`TSTemplateLiteralType`, not `TSLiteralType`), so it never
 * counts as a literal body; an interpolation-free template does.
 *
 * The fix pastes the alias body over the reference and removes the alias
 * declaration with the blank space after it. The body gets parentheses
 * when it is a union and the reference sits where `|` binds too weakly
 * (array, intersection, type operator, indexed-access object, rest,
 * optional tuple member). When a comment is attached to the declaration,
 * the rule reports without a fix, so no comment is dropped silently.
 */

"use strict";

const {
  removeWithTrailingWhitespace,
} = require("./remove-with-trailing-whitespace");

function isLiteralUnionMember(node) {
  return (
    node.type === "TSLiteralType" ||
    node.type === "TSNullKeyword" ||
    node.type === "TSUndefinedKeyword"
  );
}

function isLiteralBody(node) {
  if (node.type === "TSUnionType") {
    return node.types.every(isLiteralUnionMember);
  }
  return node.type === "TSLiteralType";
}

const TIGHTER_THAN_UNION = new Set([
  "TSArrayType",
  "TSIntersectionType",
  "TSTypeOperator",
  "TSRestType",
  "TSOptionalType",
]);

function needsParens(reference, body) {
  if (body.type !== "TSUnionType") return false;
  const parent = reference.parent;
  if (TIGHTER_THAN_UNION.has(parent.type)) return true;
  return (
    parent.type === "TSIndexedAccessType" && parent.objectType === reference
  );
}

/** @type {import("eslint").Rule.RuleModule} */
const noSingleUseLiteralAlias = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Forbid a type alias for literal types that is used once",
    },
    fixable: "code",
    messages: {
      inlineIt:
        "`{{name}}` is a literal type used exactly once. Inline the literals at the use site: a single-use alias holds no shared truth and only moves the values away from the reader.",
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode;

    return {
      TSTypeAliasDeclaration(node) {
        if (node.parent.type === "ExportNamedDeclaration") return;
        if (node.typeParameters) return;
        if (!isLiteralBody(node.typeAnnotation)) return;

        const [variable] = sourceCode.getDeclaredVariables(node);
        if (!variable) return;
        const uses = variable.references.filter(
          (reference) => reference.identifier !== node.id,
        );
        if (uses.length !== 1) return;

        const use = uses[0].identifier;
        const typeReference = use.parent;
        if (
          typeReference.type !== "TSTypeReference" ||
          typeReference.typeName !== use
        ) {
          return;
        }

        context.report({
          node: node.id,
          messageId: "inlineIt",
          data: { name: node.id.name },
          fix(fixer) {
            if (sourceCode.getCommentsBefore(node).length > 0) return null;
            const after = sourceCode.getTokenAfter(node, {
              includeComments: true,
            });
            if (
              after &&
              (after.type === "Line" || after.type === "Block") &&
              after.loc.start.line === node.loc.end.line
            ) {
              return null;
            }

            const bodyText = sourceCode.getText(node.typeAnnotation);
            const replacement = needsParens(typeReference, node.typeAnnotation)
              ? `(${bodyText})`
              : bodyText;

            return [
              fixer.replaceText(typeReference, replacement),
              removeWithTrailingWhitespace(fixer, sourceCode, node),
            ];
          },
        });
      },
    };
  },
};

module.exports = noSingleUseLiteralAlias;
