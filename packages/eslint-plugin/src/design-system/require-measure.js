"use strict";

const { getStaticKey } = require("./get-static-key");
const { isAppliedStyle } = require("./is-applied-style");

const CAP_PROPERTIES = new Set(["maxInlineSize", "maxWidth"]);

/** A length in `ch`, such as `65ch` or `.5ch`. */
const CH_LENGTH = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)ch$/i;

/**
 * Whether a value holds a `ch` length, alone or as one word of a longer value
 * such as `min(100%, 60ch)`.
 * @param {string} text
 */
function hasChLength(text) {
  return text.split(/[\s,()*/+]+/).some((word) => CH_LENGTH.test(word));
}

/**
 * The text of every static part of a style value: each branch of a
 * conditional object (`{ default: …, [breakpoints.md]: … }`), a string, or
 * the fixed parts of a template literal.
 * @param {import("estree").Node} value
 * @returns {{ node: import("estree").Node, text: string }[]}
 */
function collectStaticTexts(value) {
  if (value.type === "ObjectExpression") {
    return value.properties.flatMap((property) =>
      property.type === "Property" ? collectStaticTexts(property.value) : [],
    );
  }
  if (value.type === "Literal" && typeof value.value === "string") {
    return [{ node: value, text: value.value }];
  }
  if (value.type === "TemplateLiteral") {
    return [
      {
        node: value,
        text: value.quasis.map((quasi) => quasi.value.cooked ?? "").join(" "),
      },
    ];
  }
  return [];
}

/** @type {import("eslint").Rule.RuleModule} */
const requireMeasure = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require a line-length cap to take a `measure` token, instead of a raw `ch` width",
    },
    messages: {
      rawCh:
        "`{{property}}: {{value}}` picks a line length by hand. Take `measure.prose` for running text or `measure.short` for a short standalone block, from `tokens.stylex.ts`. A `<Text>` paragraph is already capped at `measure.prose`.",
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode;
    return {
      Property(node) {
        const property = getStaticKey(node);
        if (property === null || !CAP_PROPERTIES.has(property)) return;
        if (!isAppliedStyle(node)) return;
        for (const { node: leaf, text } of collectStaticTexts(node.value)) {
          if (!hasChLength(text)) continue;
          context.report({
            node: leaf,
            messageId: "rawCh",
            data: { property, value: sourceCode.getText(leaf) },
          });
        }
      },
    };
  },
};

module.exports = requireMeasure;
