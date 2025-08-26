// @ts-check

/**
 * @typedef {import('@babel/core')} Babel
 * @typedef {import('@babel/core').PluginPass} PluginPass
 * @typedef {import('@babel/core').NodePath} NodePath
 * @typedef {import('@babel/core').types.JSXOpeningElement} JSXOpeningElement
 * @typedef {import('@babel/core').types.JSXAttribute} JSXAttribute
 */

/**
 * @param {Babel} babel - The Babel object.
 * @returns {import('@babel/core').PluginObj<PluginPass & { cssPropUsed?: boolean, stylexImportExists?: boolean }>} The plugin object.
 */
module.exports = function stylexBabelPlugin({ types: t }) {
  return {
    name: "stylex-css-prop",
    visitor: {
      JSXAttribute(/** @type {any} */ path, /** @type {PluginPass} */ state) {
        // Check if the attribute is `css`
        if (path.node.name.name === "css") {
          state.cssPropUsed = true;

          /** @type {import('@babel/core').NodePath<JSXOpeningElement> | null} Get the parent JSXOpeningElement */
          // @ts-expect-error
          const jsxElement = path.findParent((p) =>
            t.isJSXOpeningElement(p.node),
          );
          if (!jsxElement) return;

          // Extract the `className` and `style` attributes
          const openingElement = jsxElement.node;
          /** @type {JSXAttribute | undefined} */
          // @ts-expect-error
          const classNameAttr = openingElement.attributes.find(
            /** @param {any} attr */ (attr) =>
              t.isJSXAttribute(attr) && attr.name.name === "className",
          );
          /** @type {JSXAttribute | undefined} */
          // @ts-expect-error
          const styleAttr = openingElement.attributes.find(
            /** @param {any} attr */ (attr) =>
              t.isJSXAttribute(attr) && attr.name.name === "style",
          );

          // Get the value of the `css` prop
          const cssValue = path.node.value;
          const attributesToMerge = [];

          if (t.isJSXExpressionContainer(cssValue)) {
            const expression = cssValue.expression;

            if (t.isArrayExpression(expression)) {
              // Add array elements to merge
              attributesToMerge.push(
                ...expression.elements.filter(/** @param {any} x */ (x) => !!x),
              );
            } else if (t.isExpression(expression)) {
              attributesToMerge.push(expression);
            }
          }

          if (!classNameAttr && !styleAttr) {
            // Simple transformation for `css` without merging
            path.replaceWith(
              t.jsxSpreadAttribute(
                t.callExpression(
                  t.memberExpression(
                    t.identifier("stylex"),
                    t.identifier("props"),
                  ),
                  /** @type {any[]} */ (attributesToMerge.filter(Boolean)),
                ),
              ),
            );
            return;
          }

          const classNameAttrValue = t.isJSXExpressionContainer(
            classNameAttr?.value,
          )
            ? t.isJSXEmptyExpression(classNameAttr.value.expression)
              ? (() => {
                  throw path.buildCodeFrameError(
                    "Empty expressions are not allowed.",
                  );
                })()
              : classNameAttr.value.expression
            : classNameAttr?.value;

          const styleAttrValue = t.isJSXExpressionContainer(styleAttr?.value)
            ? t.isJSXEmptyExpression(styleAttr.value.expression)
              ? (() => {
                  throw path.buildCodeFrameError(
                    "Empty expressions are not allowed.",
                  );
                })()
              : styleAttr.value.expression
            : styleAttr?.value;

          // Handle merging logic if className or style exists
          const mergedPropsFunction = t.arrowFunctionExpression(
            [],
            t.blockStatement([
              t.variableDeclaration("const", [
                t.variableDeclarator(
                  t.identifier("$_props"),
                  t.callExpression(
                    t.memberExpression(
                      t.identifier("stylex"),
                      t.identifier("props"),
                    ),
                    /** @type {any[]} */ (attributesToMerge.filter(Boolean)),
                  ),
                ),
              ]),
              t.returnStatement(
                t.objectExpression([
                  // Always spread props
                  t.spreadElement(t.identifier("$_props")),

                  ...(classNameAttrValue
                    ? [
                        t.objectProperty(
                          t.identifier("className"),
                          t.templateLiteral(
                            [
                              t.templateElement({ raw: "", cooked: "" }),
                              t.templateElement({ raw: "", cooked: "" }),
                              t.templateElement({ raw: "", cooked: "" }),
                            ],
                            [
                              t.logicalExpression(
                                "??",
                                t.memberExpression(
                                  t.identifier("$_props"),
                                  t.identifier("className"),
                                ),
                                t.stringLiteral(""),
                              ),
                              t.conditionalExpression(
                                classNameAttrValue,
                                t.templateLiteral(
                                  [
                                    t.templateElement({
                                      raw: " ",
                                      cooked: " ",
                                    }),
                                    t.templateElement({
                                      raw: "",
                                      cooked: "",
                                    }),
                                  ],
                                  [classNameAttrValue],
                                ),
                                t.stringLiteral(""),
                              ),
                            ],
                          ),
                        ),
                      ]
                    : []),

                  ...(styleAttrValue
                    ? [
                        t.objectProperty(
                          t.identifier("style"),
                          t.conditionalExpression(
                            t.logicalExpression(
                              "||",
                              styleAttrValue,
                              t.memberExpression(
                                t.identifier("$_props"),
                                t.identifier("style"),
                              ),
                            ),
                            t.objectExpression([
                              t.spreadElement(
                                t.memberExpression(
                                  t.identifier("$_props"),
                                  t.identifier("style"),
                                ),
                              ),
                              t.spreadElement(styleAttrValue),
                            ]),
                            t.identifier("undefined"),
                          ),
                        ),
                      ]
                    : []),
                ]),
              ),
            ]),
          );

          // Replace the JSX attributes with the merged props
          path.replaceWith(
            t.jsxSpreadAttribute(t.callExpression(mergedPropsFunction, [])),
          );

          // Remove original `className` and `style` attributes
          openingElement.attributes = openingElement.attributes.filter(
            /** @param {any} attr */ (attr) =>
              attr !== classNameAttr && attr !== styleAttr,
          );
        }
      },

      // Check for `stylex` import
      ImportDeclaration(
        /** @type {any} */ importPath,
        /** @type {PluginPass} */ state,
      ) {
        if (
          importPath.node.source.value === "@stylexjs/stylex" &&
          importPath.node.specifiers.some(
            /** @param {any} specifier */ (specifier) =>
              t.isImportNamespaceSpecifier(specifier) &&
              specifier.local.name === "stylex",
          )
        ) {
          state.stylexImportExists = true;
        }
      },
      Program: {
        exit(/** @type {any} */ path, /** @type {PluginPass} */ state) {
          // Inject `stylex` import if necessary after traversal
          if (state.cssPropUsed && !state.stylexImportExists) {
            path.node.body.unshift(
              t.importDeclaration(
                [t.importNamespaceSpecifier(t.identifier("stylex"))],
                t.stringLiteral("@stylexjs/stylex"),
              ),
            );
          }
        },
      },
    },
  };
};
