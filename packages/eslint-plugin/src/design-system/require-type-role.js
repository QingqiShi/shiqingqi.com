"use strict";

const { getStaticKey, getStaticString } = require("./get-static-key");
const { collectLeaves, getTokenGroup } = require("./get-token-group");
const { isAppliedStyle } = require("./is-applied-style");

/** Properties that take a token, never a raw value. */
const TOKEN_PROPERTIES = new Set([
  "fontFamily",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
]);

/** Keywords that pick no value of their own. */
const KEYWORDS = new Set(["inherit", "initial", "unset", "revert", "normal"]);

/** The token groups a font size may always take: a glyph sized to a control. */
const SIZE_TOKEN_GROUPS = new Set(["controlSize"]);

/**
 * Whether a leaf picks no value of its own: `null`, `0`, or a CSS-wide
 * keyword.
 * @param {import("estree").Node} leaf
 */
function isNeutral(leaf) {
  if (leaf.type === "Literal" && (leaf.value === null || leaf.value === 0)) {
    return true;
  }
  const text = getStaticString(leaf);
  return text !== null && (KEYWORDS.has(text.trim()) || text.trim() === "0");
}

/**
 * Whether a leaf is a value written out in the source: a number, a string, or
 * a template literal with no expressions.
 * @param {import("estree").Node} leaf
 */
function isRaw(leaf) {
  if (leaf.type === "Literal") return true;
  if (leaf.type === "UnaryExpression" && leaf.argument.type === "Literal") {
    return true;
  }
  return getStaticString(leaf) !== null;
}

/** @type {import("eslint").Rule.RuleModule} */
const requireTypeRole = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require text to take its size from a type role, and the other typographic properties from tokens",
    },
    messages: {
      fontSize:
        "`fontSize: {{value}}` picks a size apart from its line height, weight and tracking. Compose a type role from `primitives/type.stylex.ts` instead, such as `typeRole.bodySmall` or `typeRole.h3`, or use `Text` or `Heading`. A glyph sized to a control takes `controlSize`.",
      fontShorthand:
        "`font: {{value}}` sets the typography in one value. Compose a type role from `primitives/type.stylex.ts` instead.",
      numeric:
        "`fontVariantNumeric: {{value}}` sets the figures by hand. Compose `typeModifier.numeric` from `primitives/type.stylex.ts`, or use the `numeric` prop on `Text`.",
      raw: "`{{property}}: {{value}}` is a raw value. Take it from the type role, or from a `font` token in `tokens.stylex.ts`.",
    },
    schema: [
      {
        type: "object",
        properties: {
          sizeTokenGroups: {
            description: "More token groups that a font size may take.",
            type: "array",
            items: { type: "string" },
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const sourceCode = context.sourceCode;
    const sizeGroups = new Set([
      ...SIZE_TOKEN_GROUPS,
      ...(context.options[0]?.sizeTokenGroups ?? []),
    ]);

    /** @param {import("estree").Node} leaf */
    function isAllowedSize(leaf) {
      if (isNeutral(leaf)) return true;
      const group = getTokenGroup(sourceCode, leaf);
      return group !== null && sizeGroups.has(group);
    }

    return {
      Property(node) {
        const property = getStaticKey(node);
        if (property === null) return;
        const isToken = TOKEN_PROPERTIES.has(property);
        if (
          !isToken &&
          property !== "fontSize" &&
          property !== "font" &&
          property !== "fontVariantNumeric"
        ) {
          return;
        }
        if (!isAppliedStyle(node, { dynamic: true })) return;
        for (const leaf of collectLeaves(node.value)) {
          const value = sourceCode.getText(leaf);
          if (property === "fontSize") {
            if (!isAllowedSize(leaf)) {
              context.report({
                node: leaf,
                messageId: "fontSize",
                data: { value },
              });
            }
          } else if (property === "font" || property === "fontVariantNumeric") {
            if (!isNeutral(leaf)) {
              context.report({
                node: leaf,
                messageId: property === "font" ? "fontShorthand" : "numeric",
                data: { value },
              });
            }
          } else if (isRaw(leaf) && !isNeutral(leaf)) {
            context.report({
              node: leaf,
              messageId: "raw",
              data: { property, value },
            });
          }
        }
      },
    };
  },
};

module.exports = requireTypeRole;
