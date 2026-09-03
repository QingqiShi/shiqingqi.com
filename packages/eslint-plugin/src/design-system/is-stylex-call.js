"use strict";

/**
 * Whether a node is a call on the `stylex` namespace, optionally of one method.
 * @param {import("eslint").Rule.Node | null | undefined} node
 * @param {string} [method] Any `stylex` method when omitted.
 * @returns {boolean}
 */
function isStylexCall(node, method) {
  if (node == null || node.type !== "CallExpression") return false;
  const callee = node.callee;
  if (
    callee.type !== "MemberExpression" ||
    callee.object.type !== "Identifier" ||
    callee.object.name !== "stylex"
  ) {
    return false;
  }
  if (method === undefined) return true;
  return (
    callee.property.type === "Identifier" && callee.property.name === method
  );
}

module.exports = { isStylexCall };
