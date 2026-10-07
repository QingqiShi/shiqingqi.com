"use strict";

const { isStylexCall } = require("./is-stylex-call");

/** The node types a style value nests through inside a StyleX call. */
const STYLE_NESTING = new Set([
  "ObjectExpression",
  "Property",
  "ArrayExpression",
  "SpreadElement",
]);

/** A dynamic style: an arrow function that returns a style object. */
const DYNAMIC_NESTING = new Set([...STYLE_NESTING, "ArrowFunctionExpression"]);

/**
 * Whether a property declares an applied style: one nested in a
 * `stylex.create` or `stylex.keyframes` argument. Tokens and plain JavaScript
 * objects are not applied styles. With `dynamic`, a property that a dynamic
 * style returns counts too.
 * @param {import("eslint").Rule.Node} property
 * @param {{ dynamic?: boolean }} [options]
 * @returns {boolean}
 */
function isAppliedStyle(property, options = {}) {
  const nesting = options.dynamic === true ? DYNAMIC_NESTING : STYLE_NESTING;
  let node = property.parent;
  while (node != null && nesting.has(node.type)) {
    node = node.parent;
  }
  return isStylexCall(node, "create") || isStylexCall(node, "keyframes");
}

module.exports = { isAppliedStyle };
