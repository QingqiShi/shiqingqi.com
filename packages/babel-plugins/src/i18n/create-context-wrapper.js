// @ts-check

/**
 * @typedef {import('@babel/core').types} BabelTypes
 */

/**
 * Create a JSX element that wraps a child expression with ClientTranslationsProvider.
 *
 * Produces: <__I18nProvider translations={__getClientTx()}>{child}</__I18nProvider>
 *
 * @param {BabelTypes} t - Babel types
 * @param {import('@babel/types').Expression} child - The original return expression
 * @returns {import('@babel/types').JSXElement}
 */
function createContextWrapper(t, child) {
  const jsxChild =
    t.isJSXElement(child) || t.isJSXFragment(child)
      ? child
      : t.jsxExpressionContainer(child);

  const translationsAttr = t.jsxAttribute(
    t.jsxIdentifier("translations"),
    t.jsxExpressionContainer(
      t.callExpression(t.identifier("__getClientTx"), []),
    ),
  );

  return t.jsxElement(
    t.jsxOpeningElement(
      t.jsxIdentifier("__I18nProvider"),
      [translationsAttr],
      false,
    ),
    t.jsxClosingElement(t.jsxIdentifier("__I18nProvider")),
    [jsxChild],
    false,
  );
}

module.exports = { createContextWrapper };
