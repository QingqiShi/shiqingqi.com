"use strict";

const { getStaticKey } = require("./get-static-key");
const { isAppliedStyle } = require("./is-applied-style");
const { isWhenHoverKey } = require("./is-when-hover-key");

const DECORATION_PROPERTIES = new Set(["textDecoration", "textDecorationLine"]);

/**
 * Whether a style value has a `stylex.when.*(":hover")` key at any depth.
 * @param {import("estree").Node} value
 * @returns {boolean}
 */
function hasWhenHover(value) {
  if (value.type !== "ObjectExpression") return false;
  return value.properties.some((property) => {
    if (property.type !== "Property") return false;
    return isWhenHoverKey(property) || hasWhenHover(property.value);
  });
}

/** @type {import("eslint").Rule.RuleModule} */
const noPartialHoverUnderline = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Refuse a text decoration that appears on hover through `stylex.when`, which underlines part of a target of more than one line",
    },
    messages: {
      partialHoverUnderline:
        'A target of more than one line responds as a whole, so underlining part of it on hover reads as a text link inside a button. Use `Button`, `Pager`, `cardSurface.interactive` or a fill. A plain `":hover"` underline on an inline link is fine.',
    },
    schema: [],
  },

  create(context) {
    return {
      Property(node) {
        const key = getStaticKey(node);
        if (key === null || !DECORATION_PROPERTIES.has(key)) return;
        if (!isAppliedStyle(node)) return;
        if (!hasWhenHover(node.value)) return;
        context.report({ node: node.key, messageId: "partialHoverUnderline" });
      },
    };
  },
};

module.exports = noPartialHoverUnderline;
