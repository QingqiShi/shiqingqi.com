"use strict";

const { isStylexCall } = require("./is-stylex-call");

/** Each radius property with the shape properties that pair with it. */
const RADIUS_PAIRINGS = new Map([
  ["borderRadius", ["cornerShape"]],
  ["borderTopLeftRadius", ["cornerShape", "cornerTopLeftShape"]],
  ["borderTopRightRadius", ["cornerShape", "cornerTopRightShape"]],
  ["borderBottomLeftRadius", ["cornerShape", "cornerBottomLeftShape"]],
  ["borderBottomRightRadius", ["cornerShape", "cornerBottomRightShape"]],
  ["borderStartStartRadius", ["cornerShape", "cornerStartStartShape"]],
  ["borderStartEndRadius", ["cornerShape", "cornerStartEndShape"]],
  ["borderEndStartRadius", ["cornerShape", "cornerEndStartShape"]],
  ["borderEndEndRadius", ["cornerShape", "cornerEndEndShape"]],
]);

/** The node types a style value nests through inside a StyleX call. */
const STYLE_NESTING = new Set([
  "ObjectExpression",
  "Property",
  "ArrayExpression",
  "SpreadElement",
]);

/**
 * @param {import("eslint").Rule.Node} property
 * @returns {string | null}
 */
function getStaticKey(property) {
  if (property.computed) return null;
  const key = property.key;
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return null;
}

/**
 * Whether a property declares an applied style: one nested in a
 * `stylex.create` or `stylex.keyframes` argument. Tokens and plain JavaScript
 * objects are not applied styles, so they pair no shape.
 * @param {import("eslint").Rule.Node} property
 * @returns {boolean}
 */
function isAppliedStyle(property) {
  let node = property.parent;
  while (node != null && STYLE_NESTING.has(node.type)) {
    node = node.parent;
  }
  return isStylexCall(node, "create") || isStylexCall(node, "keyframes");
}

/** @type {import("eslint").Rule.RuleModule} */
const requireCornerShape = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require a corner radius property to declare its corner shape in the same object literal",
    },
    messages: {
      missingCornerShape:
        "`{{property}}` sets a radius with no `cornerShape`, or its per-corner longhand, in the same object literal. Every fixed-radius corner is a squircle (DESIGN.md), so pair the radius here, or compose `corner.radius_*` from `primitives/corner.stylex.ts` instead.",
    },
    schema: [],
  },

  create(context) {
    return {
      Property(node) {
        const property = getStaticKey(node);
        const pairings = RADIUS_PAIRINGS.get(property);
        if (pairings === undefined) return;
        // A zero radius has no corner to shape.
        if (node.value.type === "Literal" && node.value.value === 0) return;
        const parent = node.parent;
        if (parent.type !== "ObjectExpression") return;
        if (!isAppliedStyle(node)) return;
        const isPaired = parent.properties.some(
          (sibling) =>
            sibling.type === "Property" &&
            pairings.includes(getStaticKey(sibling)),
        );
        if (isPaired) return;
        context.report({
          node,
          messageId: "missingCornerShape",
          data: { property },
        });
      },
    };
  },
};

module.exports = requireCornerShape;
