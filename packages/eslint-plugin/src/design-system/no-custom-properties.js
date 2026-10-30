"use strict";

const { findVariable } = require("./find-variable");
const { getStaticKey, getStaticString } = require("./get-static-key");

/** The methods of `CSSStyleDeclaration` that take a property name first. */
const PROPERTY_METHODS = new Set([
  "setProperty",
  "getPropertyValue",
  "getPropertyPriority",
  "removeProperty",
]);

/** The CSS properties whose value names other properties. */
const NAMING_PROPERTIES = new Set([
  "transition",
  "transitionProperty",
  "willChange",
]);

const VAR_REFERENCE = /var\(\s*(--[\w-]*)/g;
const OPEN_VAR = /var\(\s*$/;
const NAMED_PROPERTY = /(?:^|[\s,])(--[\w-]+)/g;

/**
 * @param {string} name
 * @returns {boolean}
 */
function isCustomPropertyName(name) {
  return name.startsWith("--");
}

/**
 * The string a node evaluates to, through a `const` that a string
 * initialises. A template literal with expressions gives its static start,
 * which is enough to tell a custom property name.
 * @param {import("eslint").SourceCode} sourceCode
 * @param {import("estree").Node} node
 * @returns {string | null}
 */
function resolveString(sourceCode, node) {
  const value = getStaticString(node);
  if (value !== null) return value;
  if (node.type === "TemplateLiteral")
    return node.quasis[0].value.cooked ?? null;
  if (node.type !== "Identifier") return null;
  const variable = findVariable(sourceCode, node);
  const definition = variable?.defs[0];
  if (
    variable?.defs.length !== 1 ||
    definition?.type !== "Variable" ||
    definition.parent.kind !== "const" ||
    definition.node.init == null
  ) {
    return null;
  }
  return getStaticString(definition.node.init);
}

/**
 * The name of the CSS property whose value holds a node, through the
 * branches of a conditional style object, or null when the node is not a
 * style value.
 * @param {import("eslint").Rule.Node} node
 * @returns {string | null}
 */
function getStyleProperty(node) {
  let child = node;
  let parent = node.parent;
  while (parent != null) {
    if (parent.type === "Property" && parent.value === child) {
      const key = getStaticKey(parent);
      if (key === null) return null;
      if (key !== "default" && !key.startsWith(":") && !key.startsWith("@")) {
        return key;
      }
    } else if (
      parent.type !== "ObjectExpression" &&
      parent.type !== "ConditionalExpression" &&
      parent.type !== "LogicalExpression"
    ) {
      return null;
    }
    child = parent;
    parent = parent.parent;
  }
  return null;
}

/** @type {import("eslint").Rule.RuleModule} */
const noCustomProperties = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow hand-written CSS custom properties; define them with StyleX instead",
    },
    messages: {
      customProperty:
        "`{{name}}` is a hand-written CSS custom property. Nothing checks that its name matches between the places that set it and read it, and a typo fails with no error. Define it with `stylex.defineVars` in a `.stylex.ts` file, which gives it a unique name. Set it with `stylex.createTheme`, or with `[vars.name]: value` as a key in `stylex.create`; use a dynamic style (`(value) => ({ [vars.name]: value })`) for a runtime value. Read it as `vars.name`.",
      namedInTransition:
        "`{{name}}` is a hand-written CSS custom property, named here so that it can animate. StyleX cannot write the name of its own variable in `transition`, `transitionProperty` or `willChange`. Define the variable with `stylex.defineVars` and a `stylex.types.*` value, so that it can interpolate, and animate it with `stylex.keyframes` keyed by `[vars.name]`, or transition the property that reads it.",
    },
    schema: [
      {
        type: "object",
        properties: {
          allow: {
            type: "array",
            items: {
              type: "object",
              properties: {
                pattern: { type: "string" },
                reason: { type: "string" },
              },
              required: ["pattern", "reason"],
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const sourceCode = context.sourceCode;
    /** @type {{ allow?: { pattern: string }[] }} */
    const options = context.options[0] ?? {};
    const allowed = (options.allow ?? []).map(
      (entry) => new RegExp(entry.pattern, "u"),
    );

    /**
     * @param {import("estree").Node} node
     * @param {string} name
     * @param {"customProperty" | "namedInTransition"} [messageId]
     */
    function check(node, name, messageId = "customProperty") {
      if (!isCustomPropertyName(name)) return;
      if (allowed.some((pattern) => pattern.test(name))) return;
      context.report({ node, messageId, data: { name } });
    }

    /**
     * @param {import("estree").Node} node
     * @param {string} text
     */
    function checkReferences(node, text) {
      for (const match of text.matchAll(VAR_REFERENCE)) check(node, match[1]);
    }

    /**
     * @param {import("eslint").Rule.Node} node
     * @param {string} text
     */
    function checkNamedProperties(node, text) {
      const property = getStyleProperty(node);
      if (property === null || !NAMING_PROPERTIES.has(property)) return;
      for (const match of text.matchAll(NAMED_PROPERTY)) {
        check(node, match[1], "namedInTransition");
      }
    }

    return {
      Property(node) {
        if (node.parent.type !== "ObjectExpression") return;
        const key = node.computed
          ? resolveString(sourceCode, node.key)
          : getStaticKey(node);
        if (key !== null) check(node.key, key);
      },

      Literal(node) {
        if (typeof node.value !== "string") return;
        checkReferences(node, node.value);
        checkNamedProperties(node, node.value);
      },

      TemplateLiteral(node) {
        node.quasis.forEach((quasi, index) => {
          const text = quasi.value.cooked ?? quasi.value.raw;
          checkReferences(node, text);
          const expression = node.expressions[index];
          if (expression === undefined || !OPEN_VAR.test(text)) return;
          const name = resolveString(sourceCode, expression);
          if (name !== null) check(node, name);
        });
        checkNamedProperties(
          node,
          node.quasis.map((quasi) => quasi.value.cooked ?? "").join(" "),
        );
      },

      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type !== "MemberExpression" ||
          callee.computed ||
          callee.property.type !== "Identifier" ||
          !PROPERTY_METHODS.has(callee.property.name)
        ) {
          return;
        }
        const argument = node.arguments[0];
        if (argument === undefined || argument.type === "SpreadElement") return;
        const name = resolveString(sourceCode, argument);
        if (name !== null) check(argument, name);
      },
    };
  },
};

module.exports = noCustomProperties;
