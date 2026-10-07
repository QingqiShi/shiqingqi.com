"use strict";

const { getStaticKey } = require("./get-static-key");
const { isAppliedStyle } = require("./is-applied-style");

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
        "`{{property}}` sets a radius with no `cornerShape`, or its per-corner longhand, in the same object literal. Every fixed-radius corner is a squircle, so pair the radius here, or compose `corner.radius_*` from `primitives/corner.stylex.ts` instead.",
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
