// @ts-check

/**
 * @typedef {import('@babel/core').types} BabelTypes
 */

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

module.exports = { injectSetLocale };
