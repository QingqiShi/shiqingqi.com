// @ts-check

const { buildSpecimenSource } = require("./build-specimen-source");
const {
  collectModuleFacts,
  readStringValue,
} = require("./collect-module-facts");
const { sourceAttribute, tokeniseAt } = require("./source-attribute");

/**
 * @typedef {import("@babel/core").PluginPass} PluginPass
 * @typedef {typeof import("@babel/types")} BabelTypes
 * @typedef {import("@babel/types").JSXOpeningElement} JSXOpeningElement
 * @typedef {import("@babel/types").JSXAttribute} JSXAttribute
 * @typedef {import("./collect-module-facts").ModuleFacts} ModuleFacts
 */

/**
 * A Babel plugin that reveals the source of a design-system specimen.
 *
 * It gives every `<Specimen>` and `<Example>` a `source` prop holding the
 * token array for its children, and every `<UsageSnippet code={…}>` the token
 * array for its code. The children show each `t()` in the reader's locale.
 * The text comes from the original file rather than from the AST, so it must
 * run first: a later plugin that rewrites `t()` would otherwise decide what the
 * reader sees.
 *
 * @param {{ types: BabelTypes }} babel
 * @returns {import("@babel/core").PluginObject<PluginPass>}
 */
module.exports = function specimenSourcePlugin({ types: t }) {
  return {
    // The i18n plugin and React Compiler both rewrite the AST before any
    // visitor of this plugin runs. pre() runs before all visitors, and
    // Babel runs each plugin's pre() in list order, so this plugin reads
    // the module first.
    pre(file) {
      const code = file.code;
      if (!code) return;
      // Most of the app holds none of these elements. Each is matched by its
      // literal JSX name below, so a file whose text lacks all of them cannot
      // produce a match — skip the walk rather than collect facts nothing
      // will read.
      if (
        !code.includes("<Specimen") &&
        !code.includes("<UsageSnippet") &&
        !code.includes("<Example")
      ) {
        return;
      }
      const path = file.path;
      const facts = collectModuleFacts(t, path, code);

      path.traverse({
        JSXElement(elementPath) {
          const opening = elementPath.node.openingElement;
          if (!t.isJSXIdentifier(opening.name)) return;
          if (findAttribute(t, opening, "source")) return;

          const element = opening.name.name;

          if (element === "Specimen" || element === "Example") {
            const attribute = buildSpecimenSource(t, elementPath, code, facts);
            if (attribute) opening.attributes.push(attribute);
            return;
          }

          if (element === "UsageSnippet") {
            const snippet = resolveSnippet(t, opening, facts);
            if (snippet === null) return;
            opening.attributes.push(
              sourceAttribute(t, tokeniseAt(snippet, elementPath), []),
            );
          }
        },
      });
    },
  };
};

// ── Injection ────────────────────────────────────────────────────────────────

/**
 * @param {BabelTypes} t
 * @param {JSXOpeningElement} opening
 * @param {string} name
 * @returns {JSXAttribute | null}
 */
function findAttribute(t, opening, name) {
  for (const attribute of opening.attributes) {
    if (
      t.isJSXAttribute(attribute) &&
      t.isJSXIdentifier(attribute.name, { name })
    ) {
      return attribute;
    }
  }
  return null;
}

/**
 * The code a `<UsageSnippet>` shows, resolving a module-level constant.
 *
 * @param {BabelTypes} t
 * @param {JSXOpeningElement} opening
 * @param {ModuleFacts} facts
 * @returns {string | null}
 */
function resolveSnippet(t, opening, facts) {
  const attribute = findAttribute(t, opening, "code");
  if (!attribute?.value) return null;
  if (t.isStringLiteral(attribute.value)) return attribute.value.value;
  if (!t.isJSXExpressionContainer(attribute.value)) return null;

  const expression = attribute.value.expression;
  const text = readStringValue(t, expression);
  if (text !== null) return text;
  if (t.isIdentifier(expression)) {
    return facts.constants.get(expression.name) ?? null;
  }
  return null;
}
