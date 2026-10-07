"use strict";

/**
 * The string a node always evaluates to: a string literal, or a template
 * literal with no expressions.
 * @param {import("estree").Node} node
 * @returns {string | null}
 */
function getStaticString(node) {
  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0].value.cooked ?? null;
  }
  return null;
}

/**
 * @param {import("eslint").Rule.Node} property
 * @returns {string | null}
 */
function getStaticKey(property) {
  const key = property.key;
  if (!property.computed && key.type === "Identifier") return key.name;
  return getStaticString(key);
}

module.exports = { getStaticKey, getStaticString };
