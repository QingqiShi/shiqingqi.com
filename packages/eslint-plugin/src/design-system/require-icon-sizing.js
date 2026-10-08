"use strict";

const PHOSPHOR_SOURCE = /^@phosphor-icons\/react(?:\/|$)/;

/** The props that set what the parent sets: the size and the colour. */
const PARENT_PROPS = new Set(["size", "color"]);

/**
 * The name a JSX element is written with: `PlusIcon`, or the object of a
 * member such as `Phosphor` in `Phosphor.PlusIcon`.
 * @param {import("estree-jsx").JSXOpeningElement["name"]} name
 * @returns {string | null}
 */
function getRootName(name) {
  if (name.type === "JSXIdentifier") return name.name;
  if (name.type === "JSXMemberExpression") {
    let object = name.object;
    while (object.type === "JSXMemberExpression") object = object.object;
    return object.type === "JSXIdentifier" ? object.name : null;
  }
  return null;
}

/**
 * @param {import("estree-jsx").JSXOpeningElement["attributes"][number]} attribute
 * @returns {string | null}
 */
function getAttributeName(attribute) {
  if (attribute.type !== "JSXAttribute") return null;
  return attribute.name.type === "JSXIdentifier" ? attribute.name.name : null;
}

/**
 * Whether a spread can carry props the rule cannot see. A spread of
 * `stylex.props(…)` carries only `className` and `style`.
 * @param {import("estree-jsx").JSXSpreadAttribute} attribute
 */
function canCarryProps(attribute) {
  const argument = attribute.argument;
  return !(
    argument.type === "CallExpression" &&
    argument.callee.type === "MemberExpression" &&
    argument.callee.object.type === "Identifier" &&
    argument.callee.object.name === "stylex" &&
    argument.callee.property.type === "Identifier" &&
    argument.callee.property.name === "props"
  );
}

/** @type {import("eslint").Rule.RuleModule} */
const requireIconSizing = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require a Phosphor icon to take its size and colour from its parent, and to name its weight",
    },
    messages: {
      parentProp:
        "`{{prop}}` on `<{{icon}}>` overrides the 1em size and the currentColor fill that a slot or a parent sets. Remove it, and set `fontSize` (a type role or a `controlSize` token) or `color` on the parent.",
      missingWeight:
        '`<{{icon}}>` has no `weight`, so it renders at Phosphor\'s regular, lighter than the bold glyphs the package draws in its controls. Pass `weight="bold"`, or the weight the design asks for.',
    },
    schema: [],
  },

  create(context) {
    /** The local names that the file imports from Phosphor. */
    const icons = new Set();

    return {
      ImportDeclaration(node) {
        if (typeof node.source.value !== "string") return;
        if (!PHOSPHOR_SOURCE.test(node.source.value)) return;
        if (node.importKind === "type") return;
        for (const specifier of node.specifiers) {
          if (specifier.importKind === "type") continue;
          icons.add(specifier.local.name);
        }
      },

      /** @param {import("estree-jsx").JSXOpeningElement} node */
      JSXOpeningElement(node) {
        const icon = getRootName(node.name);
        if (icon === null || !icons.has(icon)) return;
        const iconName = context.sourceCode.getText(node.name);

        let hasWeight = false;
        let hasSpread = false;
        for (const attribute of node.attributes) {
          if (attribute.type === "JSXSpreadAttribute") {
            if (canCarryProps(attribute)) hasSpread = true;
            continue;
          }
          const prop = getAttributeName(attribute);
          if (prop === "weight") hasWeight = true;
          if (prop !== null && PARENT_PROPS.has(prop)) {
            context.report({
              node: attribute,
              messageId: "parentProp",
              data: { prop, icon: iconName },
            });
          }
        }

        // A spread can carry the weight, so the rule cannot see it.
        if (!hasWeight && !hasSpread) {
          context.report({
            node,
            messageId: "missingWeight",
            data: { icon: iconName },
          });
        }
      },
    };
  },
};

module.exports = requireIconSizing;
