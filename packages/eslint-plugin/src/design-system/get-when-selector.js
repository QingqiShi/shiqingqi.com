"use strict";

const { getStaticString } = require("./get-static-key");

/**
 * Whether a key is `stylex.when.*(selector, …)` with a static selector.
 * @param {import("estree").Node} key
 * @returns {string | null} The selector.
 */
function getWhenSelector(key) {
  if (
    key.type !== "CallExpression" ||
    key.callee.type !== "MemberExpression" ||
    key.callee.object.type !== "MemberExpression" ||
    key.callee.object.object.type !== "Identifier" ||
    key.callee.object.object.name !== "stylex" ||
    key.callee.object.property.type !== "Identifier" ||
    key.callee.object.property.name !== "when"
  ) {
    return null;
  }
  const selector = key.arguments[0];
  return selector === undefined ? null : getStaticString(selector);
}

module.exports = { getWhenSelector };
