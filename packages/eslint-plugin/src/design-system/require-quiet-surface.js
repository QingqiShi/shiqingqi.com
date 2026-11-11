"use strict";

const { getStaticKey } = require("./get-static-key");
const { isAppliedStyle } = require("./is-applied-style");
const { isWhenHoverKey } = require("./is-when-hover-key");

/** @param {import("estree").Property} property */
function isHoverKey(property) {
  const key = getStaticKey(property);
  if (key !== null) return key.startsWith(":") && key.includes(":hover");
  return isWhenHoverKey(property);
}

/**
 * @param {import("estree").Node} value
 * @returns {import("estree").Property[]}
 */
function getProperties(value) {
  if (value.type !== "ObjectExpression") return [];
  return value.properties.filter((property) => property.type === "Property");
}

/** @param {import("estree").Node} value */
function isControlHoverToken(value) {
  return (
    value.type === "MemberExpression" &&
    !value.computed &&
    value.object.type === "Identifier" &&
    value.object.name === "color" &&
    value.property.type === "Identifier" &&
    value.property.name === "accent"
  );
}

/**
 * Whether a style value has `color.accent` under a hover key, at any
 * depth, whichever of the hover key and the `pointer.canHover` gate is outside.
 * @param {import("estree").Node} value
 * @param {boolean} [underHover]
 * @returns {boolean}
 */
function hasHoverFill(value, underHover = false) {
  if (underHover && isControlHoverToken(value)) return true;
  return getProperties(value).some((property) =>
    hasHoverFill(property.value, underHover || isHoverKey(property)),
  );
}

/**
 * Whether a background has no fill of its own at rest. A rest value that is
 * another token is a control with a surface, which is a different look.
 * @param {import("estree").Node} value
 */
function isTransparentAtRest(value) {
  const rest = getProperties(value).find(
    (property) => getStaticKey(property) === "default",
  );
  if (rest === undefined) return true;
  return (
    rest.value.type === "Literal" &&
    (rest.value.value === null || rest.value.value === "transparent")
  );
}

/** @type {import("eslint").Rule.RuleModule} */
const requireQuietSurface = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Refuse a hand-written hover fill of `color.accent` on an element that is transparent at rest",
    },
    messages: {
      handBuilt:
        "An element that is transparent at rest and fills on hover takes `quietSurface.interactive` from `@tuja/ui/primitives/quiet-surface.stylex`, which also carries the press, the selected state, the focus ring and the touch feel.",
    },
    schema: [],
  },

  create(context) {
    return {
      Property(node) {
        if (getStaticKey(node) !== "backgroundColor") return;
        if (!isAppliedStyle(node)) return;
        if (!isTransparentAtRest(node.value)) return;
        if (!hasHoverFill(node.value)) return;
        context.report({ node: node.key, messageId: "handBuilt" });
      },
    };
  },
};

module.exports = requireQuietSurface;
