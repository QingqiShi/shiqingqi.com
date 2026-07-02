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

/**
 * Inject `setLocale(validateLocale(params.locale))` at the top of a function.
 * Makes the function async if needed, adds a props param if missing, then
 * prepends `const __params = await props.params; __setLocale(...)`.
 *
 * @param {BabelTypes} t - Babel types
 * @param {import('@babel/types').FunctionDeclaration} decl
 */
function injectSetLocale(t, decl) {
  // Make async if not already
  decl.async = true;

  /** @type {string} */
  let propsName;

  if (decl.params.length === 0) {
    // No params — add __props
    decl.params.push(t.identifier("__props"));
    propsName = "__props";
  } else if (t.isIdentifier(decl.params[0])) {
    // Simple identifier param like (props) — use as-is
    propsName = decl.params[0].name;
  } else {
    // Destructured param like ({ params }) — replace with __props
    // and restore the original destructuring as a variable declaration
    const originalParam = decl.params[0];
    const propsId = t.identifier("__props");
    // Preserve type annotation from the original param
    if (originalParam.typeAnnotation) {
      propsId.typeAnnotation = originalParam.typeAnnotation;
    }
    decl.params[0] = propsId;
    propsName = "__props";

    // Restore original destructuring: const { ... } = __props;
    const cloned = t.cloneNode(originalParam);
    // Remove type annotation from the destructuring target
    delete cloned.typeAnnotation;
    decl.body.body.unshift(
      t.variableDeclaration("const", [
        t.variableDeclarator(cloned, t.identifier("__props")),
      ]),
    );
  }

  // Inject at top of function body:
  //   const __params = await props.params;
  //   __setLocale(__validateLocale(__params.locale));
  const paramsDecl = t.variableDeclaration("const", [
    t.variableDeclarator(
      t.identifier("__params"),
      t.awaitExpression(
        t.memberExpression(t.identifier(propsName), t.identifier("params")),
      ),
    ),
  ]);

  const setLocaleCall = t.expressionStatement(
    t.callExpression(t.identifier("__setLocale"), [
      t.callExpression(t.identifier("__validateLocale"), [
        t.memberExpression(t.identifier("__params"), t.identifier("locale")),
      ]),
    ]),
  );

  decl.body.body.unshift(paramsDecl, setLocaleCall);
}

module.exports = {
  hasParseOption,
  extractTranslations,
  createContextWrapper,
  injectSetLocale,
};
