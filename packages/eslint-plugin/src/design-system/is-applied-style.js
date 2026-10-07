"use strict";

const { isStylexCall } = require("./is-stylex-call");

/** The node types a style value nests through inside a StyleX call. */
const STYLE_NESTING = new Set([
  "ObjectExpression",
  "Property",
  "ArrayExpression",
  "SpreadElement",
]);

/**
 * Whether a property declares an applied style: one nested in a
 * `stylex.create` or `stylex.keyframes` argument. Tokens and plain JavaScript
 * objects are not applied styles.
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

module.exports = { isAppliedStyle };
