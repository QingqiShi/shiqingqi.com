// @ts-check

/**
 * @typedef {typeof import('@babel/types')} BabelTypes
 */

/**
 * Read the property name of an object property when it is static:
 * `en`, `"en"` and `["en"]` all name `en`, but `[en]` names whatever the
 * variable `en` holds.
 * @param {BabelTypes} t - Babel types
 * @param {import('@babel/types').ObjectProperty} prop
 * @returns {string | null}
 */
function getStaticPropertyName(t, prop) {
  if (t.isIdentifier(prop.key) && !prop.computed) {
    return prop.key.name;
  }
  if (t.isStringLiteral(prop.key)) {
    return prop.key.value;
  }
  return null;
}

/**
 * Read the translation pair from the first argument of a `t()` call: an
 * object literal whose `en` and `zh` properties are string literals.
 * The i18n codegen and the Babel plugin both use this function. Thus each
 * call that the codegen adds to a bundle is a call that the plugin can
 * transform.
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
    if (!t.isObjectProperty(prop) || !t.isStringLiteral(prop.value)) {
      continue;
    }
    const name = getStaticPropertyName(t, prop);
    if (name === "en") {
      en = prop.value.value;
    } else if (name === "zh") {
      zh = prop.value.value;
    }
  }

  if (en !== null && zh !== null) {
    return { en, zh };
  }
  return null;
}

module.exports = { extractTranslations };
