"use strict";

const { getStaticKey, getStaticString } = require("./get-static-key");
const { isAppliedStyle } = require("./is-applied-style");

/**
 * The condition names that only match a device that can hover:
 * `pointer.canHover`, and the stricter `pointerConstants.NON_TOUCH_DEVICE`.
 */
const GATE_NAMES = new Set(["canHover", "NON_TOUCH_DEVICE"]);

/** A media query that tests for hover, written out instead of named. */
const LITERAL_HOVER_QUERY = /^@media\b.*\(\s*hover\s*:\s*hover\s*\)/;

/**
 * The pseudo-classes that StyleX ranks above `:hover`. A media query ranks
 * above all of them, so once the hover moves into one they lose to it.
 */
const OUTRANKS_HOVER = /^:(?:active|focus)(?![\w-])/;

/**
 * Whether a key is `stylex.when.*(selector, …)` with a static selector.
 * @param {import("estree").Node} key
 * @returns {string | null} The selector.
 */
function getWhenSelector(key) {
  if (
    key.type !== "CallExpression" ||
    key.callee.type !== "MemberExpression" ||
    key.callee.object.type !== "MemberExpression" ||
    key.callee.object.object.type !== "Identifier" ||
    key.callee.object.object.name !== "stylex" ||
    key.callee.object.property.type !== "Identifier" ||
    key.callee.object.property.name !== "when"
  ) {
    return null;
  }
  const selector = key.arguments[0];
  return selector === undefined ? null : getStaticString(selector);
}

/**
 * @param {import("estree").Node} node
 * @returns {node is import("eslint").Rule.Node & import("estree").Property}
 */
function isProperty(node) {
  return node != null && node.type === "Property";
}

/** @param {import("estree").Property} property */
function isHoverKey(property) {
  const key = getStaticKey(property);
  if (key !== null) return key.startsWith(":") && key.includes(":hover");
  const selector = property.computed ? getWhenSelector(property.key) : null;
  return selector !== null && selector.includes(":hover");
}

/**
 * Whether a static key chains two pseudo-classes, such as `:disabled:hover`.
 * `@stylexjs/valid-styles` refuses a nested value under such a key.
 * @param {import("estree").Property} property
 */
function isCompoundKey(property) {
  const key = getStaticKey(property);
  if (key === null) return false;
  let flat = key;
  while (/\([^()]*\)/.test(flat)) flat = flat.replace(/\([^()]*\)/g, "");
  return flat.split(":").length > 2;
}

/** @param {import("estree").Property} property */
function isLiteralHoverQuery(property) {
  const key = getStaticKey(property);
  return key !== null && LITERAL_HOVER_QUERY.test(key);
}

/** @param {import("estree").Property} property */
function isGateKey(property) {
  if (isLiteralHoverQuery(property)) return true;
  if (!property.computed) return false;
  const key = property.key;
  if (key.type === "Identifier") return GATE_NAMES.has(key.name);
  return (
    key.type === "MemberExpression" &&
    !key.computed &&
    key.property.type === "Identifier" &&
    GATE_NAMES.has(key.property.name)
  );
}

/**
 * The properties of an object value, or none for any other value.
 * @param {import("estree").Node} value
 * @returns {import("estree").Property[]}
 */
function getProperties(value) {
  if (value.type !== "ObjectExpression") return [];
  return value.properties.filter(isProperty);
}

/**
 * Whether the property sits inside a gate, or wraps its own value in one.
 * @param {import("eslint").Rule.Node & import("estree").Property} property
 */
function isGated(property) {
  if (getProperties(property.value).some(isGateKey)) return true;
  let node = property.parent;
  while (node != null && node.type === "ObjectExpression") {
    const owner = node.parent;
    if (!isProperty(owner)) return false;
    if (isGateKey(owner)) return true;
    node = owner.parent;
  }
  return false;
}

/** @type {import("eslint").Rule.RuleModule} */
const requireHoverMedia = {
  meta: {
    type: "problem",
    hasSuggestions: true,
    docs: {
      description:
        "Require every `:hover` style to apply only on a device that can hover",
    },
    messages: {
      ungated:
        "`{{key}}` also matches on touch, where a tap leaves it stuck until the next tap elsewhere. Wrap its value as `{ default: null, [pointer.canHover]: value }`, with `pointer` from `breakpoints.stylex.ts`, or move it with the other hover keys of this property into one `[pointer.canHover]: { default: null, … }` branch. Where the hover reveals content or a control the visitor needs, make the revealed state the default and hold it back inside `[pointer.canHover]` instead, so that touch gets it in full. Where it adds only emphasis, such as a colour, keep touch at rest, and show a colour on `:active` too.",
      literalQuery:
        "Name this query `[pointer.canHover]` from `breakpoints.stylex.ts`, so that every hover style tests the same device.",
      outranked:
        "`{{key}}` outranks a bare `:hover`, but a hover inside `[pointer.canHover]` outranks it. Gate it too, as `{ default: value, [pointer.canHover]: value }`, so that it still wins on a device that can hover.",
      wrapInGate:
        "Wrap the value in `[pointer.canHover]` (import `pointer` if it is missing).",
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode;

    /**
     * Whether a gated hover in the same conditional object outranks this
     * state, which has no gate of its own.
     * @param {import("eslint").Rule.Node & import("estree").Property} property
     */
    function isOutranked(property) {
      const parent = property.parent;
      if (parent.type !== "ObjectExpression") return false;
      const key = sourceCode.getText(property.key);
      return parent.properties.filter(isProperty).some((sibling) => {
        if (isHoverKey(sibling)) {
          return getProperties(sibling.value).some(isGateKey);
        }
        if (!isGateKey(sibling)) return false;
        const branch = getProperties(sibling.value);
        return (
          branch.some(isHoverKey) &&
          !branch.some((inner) => sourceCode.getText(inner.key) === key)
        );
      });
    }

    return {
      Property(node) {
        if (!isAppliedStyle(node)) return;

        if (isLiteralHoverQuery(node)) {
          context.report({ node: node.key, messageId: "literalQuery" });
          return;
        }

        if (isHoverKey(node)) {
          if (isGated(node)) return;
          context.report({
            node: node.key,
            messageId: "ungated",
            data: { key: sourceCode.getText(node.key) },
            suggest: isCompoundKey(node)
              ? []
              : [
                  {
                    messageId: "wrapInGate",
                    fix: (fixer) =>
                      fixer.replaceText(
                        node.value,
                        `{ default: null, [pointer.canHover]: ${sourceCode.getText(node.value)} }`,
                      ),
                  },
                ],
          });
          return;
        }

        const key = getStaticKey(node);
        if (key === null || !OUTRANKS_HOVER.test(key)) return;
        if (isGated(node) || !isOutranked(node)) return;
        context.report({
          node: node.key,
          messageId: "outranked",
          data: { key },
        });
      },
    };
  },
};

module.exports = requireHoverMedia;
