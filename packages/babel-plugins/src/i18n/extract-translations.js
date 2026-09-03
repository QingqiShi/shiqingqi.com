// @ts-check

/**
 * @typedef {import('@babel/core').types} BabelTypes
 */

/**
 * Validate that a node is an ObjectExpression with `en` and `zh` StringLiteral properties.
 * @param {BabelTypes} t - Babel types
 * @param {import('@babel/types').Node} node
 * @returns {{ en: string, zh: string } | null}
 */
function extractTranslations(t, node) {
  if (!t.isObjectExpression(node)) {
    return null;
  }

  /** @type {string | null} */
  let en = null;
  /** @type {string | null} */
  let zh = null;

  for (const prop of node.properties) {
    if (!t.isObjectProperty(prop)) {
      continue;
    }
    if (
      t.isIdentifier(prop.key, { name: "en" }) &&
      t.isStringLiteral(prop.value)
    ) {
      en = prop.value.value;
    }
    if (
      t.isIdentifier(prop.key, { name: "zh" }) &&
      t.isStringLiteral(prop.value)
    ) {
      zh = prop.value.value;
    }
  }

  if (en !== null && zh !== null) {
    return { en, zh };
  }
  return null;
}

module.exports = { extractTranslations };
