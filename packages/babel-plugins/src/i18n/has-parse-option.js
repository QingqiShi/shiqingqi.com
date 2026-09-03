// @ts-check

/**
 * @typedef {import('@babel/core').types} BabelTypes
 */

/**
 * Check if the second argument to t() has { parse: true }.
 * @param {BabelTypes} t - Babel types
 * @param {import('@babel/types').Node | undefined} node - The second argument node
 * @returns {boolean}
 */
function hasParseOption(t, node) {
  if (!node || !t.isObjectExpression(node)) {
    return false;
  }
  return node.properties.some(
    (prop) =>
      t.isObjectProperty(prop) &&
      t.isIdentifier(prop.key, { name: "parse" }) &&
      t.isBooleanLiteral(prop.value, { value: true }),
  );
}

module.exports = { hasParseOption };
