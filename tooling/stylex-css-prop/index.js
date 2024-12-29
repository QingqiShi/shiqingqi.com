// @ts-check

/**
 * @typedef {import('@babel/core')} Babel
 * @typedef {import('@babel/core').PluginPass} PluginPass
 */

/**
 * @param {Babel} babel - The Babel object.
 * @returns {import('@babel/core').PluginObj<PluginPass & { opts: { breakpoints: { [key: string]: number }} }>} The plugin object.
 */
module.exports = function stylexBabelPlugin({ types: t }) {
  return {
    name: "stylex-css-prop",
    inherits: require("@babel/plugin-syntax-jsx").default,
    visitor: {
      Program: {
        enter(path, state) {
          // Track whether stylex is imported or needed
          state.hasStylexImport = false;
          state.stylexUsed = false;

          // Check for existing `stylex` imports
          path.node.body.forEach((node) => {
            if (
              t.isImportDeclaration(node) &&
              node.source.value === "@stylexjs/stylex"
            ) {
              state.hasStylexImport = true;
            }
          });
        },
        exit(path, state) {
          if (state.stylexUsed && !state.hasStylexImport) {
            // Add `import * as stylex from "@stylexjs/stylex";` at the top
            path.unshiftContainer(
              "body",
              t.importDeclaration(
                [t.importNamespaceSpecifier(t.identifier("stylex"))],
                t.stringLiteral("@stylexjs/stylex")
              )
            );
          }
        },
      },
      JSXAttribute(path, state) {
        // Check if the attribute is `css`
        if (path.node.name.name !== "css") return;

        /** @type {babel.NodePath<babel.types.JSXOpeningElement> | null} Get the parent JSXOpeningElement */
        // @ts-expect-error
        const jsxElement = path.findParent((p) =>
          t.isJSXOpeningElement(p.node)
        );
        if (!jsxElement) return;

        // Mark that stylex is used in this file
        state.stylexUsed = true;

        // Extract the `className` and `style` attributes
        const openingElement = jsxElement.node;
        /** @type {babel.types.JSXAttribute | undefined} */
        // @ts-ignore
        const classNameAttr = openingElement.attributes.find(
          (attr) => t.isJSXAttribute(attr) && attr.name.name === "className"
        );
        /** @type {babel.types.JSXAttribute | undefined} */
        // @ts-ignore
        const styleAttr = openingElement.attributes.find(
          (attr) => t.isJSXAttribute(attr) && attr.name.name === "style"
        );

        // Get the value of the `css` prop
        const cssValue = path.node.value;
        const attributesToMerge = [];

        if (t.isJSXExpressionContainer(cssValue)) {
          const expression = cssValue.expression;

          if (t.isArrayExpression(expression)) {
            // Add array elements to merge
            attributesToMerge.push(...expression.elements.filter((x) => !!x));
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
                  t.identifier("props")
                ),
                attributesToMerge
              )
            )
          );
          return;
        }

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
                    t.identifier("props")
                  ),
                  attributesToMerge
                )
              ),
            ]),
            t.returnStatement(
              t.objectExpression([
                // Always spread props
                t.spreadElement(t.identifier("$_props")),

                ...(classNameAttr?.value
                  ? [
                      t.objectProperty(
                        t.identifier("className"),
                        t.templateLiteral(
                          [
                            t.templateElement({ raw: "", cooked: "" }),
                            t.templateElement({ raw: " ", cooked: " " }),
                            t.templateElement({ raw: "", cooked: "" }),
                          ],
                          [
                            t.memberExpression(
                              t.identifier("$_props"),
                              t.identifier("className")
                            ),
                            // @ts-ignore
                            t.isJSXExpressionContainer(classNameAttr.value)
                              ? classNameAttr.value.expression
                              : classNameAttr.value,
                          ]
                        )
                      ),
                    ]
                  : []),

                ...(styleAttr?.value
                  ? [
                      t.objectProperty(
                        t.identifier("style"),
                        t.objectExpression([
                          t.spreadElement(
                            t.memberExpression(
                              t.identifier("$_props"),
                              t.identifier("style")
                            )
                          ),
                          t.spreadElement(
                            // @ts-ignore
                            t.isJSXExpressionContainer(styleAttr.value)
                              ? styleAttr.value.expression
                              : styleAttr.value
                          ),
                        ])
                      ),
                    ]
                  : []),
              ])
            ),
          ])
        );

        // Replace the JSX attributes with the merged props
        path.replaceWith(
          t.jsxSpreadAttribute(t.callExpression(mergedPropsFunction, []))
        );

        // Remove original `className` and `style` attributes
        openingElement.attributes = openingElement.attributes.filter(
          (attr) => attr !== classNameAttr && attr !== styleAttr
        );
      },
    },
  };
};
