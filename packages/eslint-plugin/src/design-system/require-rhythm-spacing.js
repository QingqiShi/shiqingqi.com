"use strict";

const { getStaticKey, getStaticString } = require("./get-static-key");
const { isAppliedStyle } = require("./is-applied-style");

const GAP_PROPERTIES = new Set(["gap", "rowGap", "columnGap"]);

const MARGIN_PROPERTIES = new Set([
  "margin",
  "marginBlock",
  "marginBlockStart",
  "marginBlockEnd",
  "marginInline",
  "marginInlineStart",
  "marginInlineEnd",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
]);

/** The token groups a gap may always take. */
const GAP_TOKEN_GROUPS = new Set(["rhythm", "controlSize"]);

/** A CSS length with a number in front: `1px`, `.5rem`, `-2px`, `10%`. */
const LENGTH = /^[+-]?(?:\d+\.?\d*|\.\d+)[a-z%]*$/i;

/**
 * The leaves of a style value: each branch of a conditional object
 * (`{ default: …, [breakpoints.md]: … }`), or the value itself.
 * @param {import("estree").Node} value
 * @returns {import("estree").Node[]}
 */
function collectLeaves(value) {
  if (value.type === "ObjectExpression") {
    return value.properties.flatMap((property) =>
      property.type === "Property" ? collectLeaves(property.value) : [],
    );
  }
  return [value];
}

/**
 * The name an identifier is imported under, so that `import { space as s }`
 * resolves `s` to `space`. An identifier with no import keeps its own name.
 * @param {import("eslint").SourceCode} sourceCode
 * @param {import("estree").Identifier} identifier
 * @returns {{ name: string, namespace: boolean }}
 */
function resolveImportName(sourceCode, identifier) {
  let scope = sourceCode.getScope(identifier);
  while (scope != null) {
    const variable = scope.set.get(identifier.name);
    if (variable !== undefined) {
      const definition = variable.defs[0];
      if (definition?.type === "ImportBinding") {
        const specifier = definition.node;
        if (specifier.type === "ImportNamespaceSpecifier") {
          return { name: identifier.name, namespace: true };
        }
        if (
          specifier.type === "ImportSpecifier" &&
          specifier.imported.type === "Identifier"
        ) {
          return { name: specifier.imported.name, namespace: false };
        }
      }
      break;
    }
    scope = scope.upper;
  }
  return { name: identifier.name, namespace: false };
}

/**
 * The token group a member expression reads, such as `space` for `space._2`,
 * `s._2` after `import { space as s }`, or `tokens.space._2` after
 * `import * as tokens`.
 * @param {import("eslint").SourceCode} sourceCode
 * @param {import("estree").Node} node
 * @returns {string | null}
 */
function getTokenGroup(sourceCode, node) {
  if (node.type !== "MemberExpression") return null;
  const object = node.object;
  if (object.type === "Identifier") {
    const resolved = resolveImportName(sourceCode, object);
    return resolved.namespace ? null : resolved.name;
  }
  if (
    object.type === "MemberExpression" &&
    !object.computed &&
    object.object.type === "Identifier" &&
    object.property.type === "Identifier" &&
    resolveImportName(sourceCode, object.object).namespace
  ) {
    return object.property.name;
  }
  return null;
}

/**
 * Whether each word of a static value is `0`, `auto`, a negative length, or a
 * negative `calc()`.
 * @param {string} text
 */
function isNeutralMargin(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("calc(-")) return true;
  return trimmed
    .split(/\s+/)
    .every(
      (word) =>
        word === "auto" ||
        !LENGTH.test(word) ||
        word.startsWith("-") ||
        Number.parseFloat(word) === 0,
    );
}

/** @type {import("eslint").Rule.RuleModule} */
const requireRhythmSpacing = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require a gap or a margin between siblings to name its relationship with a `rhythm` step, instead of a size",
    },
    messages: {
      gapStep:
        "`{{property}}: {{value}}` picks a gap by size. Name the relationship instead: `rhythm.inline`, `rhythm.tight`, `rhythm.item`, `rhythm.group` or `rhythm.section` from `tokens.stylex.ts`, or compose `stack.*`, `cluster.*` or `row.*` from `primitives/stack.stylex.ts`. A gap inside a control takes `controlSize`.",
      marginStep:
        "`{{property}}: {{value}}` pushes a sibling away by size. A margin is `0`, `auto`, a negative offset or a `rhythm` step; or let a `stack.*`, `cluster.*` or `row.*` parent own the gap.",
    },
    schema: [
      {
        type: "object",
        properties: {
          gapTokenGroups: {
            description:
              "More token groups that a gap may take, such as a gridline width.",
            type: "array",
            items: { type: "string" },
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const sourceCode = context.sourceCode;
    const gapGroups = new Set([
      ...GAP_TOKEN_GROUPS,
      ...(context.options[0]?.gapTokenGroups ?? []),
    ]);

    /** @param {import("estree").Node} leaf */
    function isAllowedGap(leaf) {
      if (leaf.type === "Literal") {
        return leaf.value === null || leaf.value === 0 || leaf.value === "0";
      }
      const text = getStaticString(leaf);
      if (text !== null) return text.trim() === "0";
      const group = getTokenGroup(sourceCode, leaf);
      return group !== null && gapGroups.has(group);
    }

    /** @param {import("estree").Node} leaf */
    function isAllowedMargin(leaf) {
      if (leaf.type === "Literal" && typeof leaf.value === "number") {
        return leaf.value <= 0;
      }
      const text = getStaticString(leaf);
      if (text !== null) return isNeutralMargin(text);
      if (leaf.type === "TemplateLiteral") {
        const head = (leaf.quasis[0].value.cooked ?? "").trim();
        const tail = (leaf.quasis.at(-1)?.value.cooked ?? "").trim();
        if (head.startsWith("-") || head.startsWith("calc(-")) return true;
        if (head === "calc(" && /^\*\s*-1\s*\)$/.test(tail)) return true;
        return (
          !leaf.expressions.some(
            (expression) => getTokenGroup(sourceCode, expression) === "space",
          ) &&
          leaf.quasis.every((quasi) =>
            isNeutralMargin(quasi.value.cooked ?? ""),
          )
        );
      }
      return getTokenGroup(sourceCode, leaf) !== "space";
    }

    return {
      Property(node) {
        const property = getStaticKey(node);
        if (property === null) return;
        const isGap = GAP_PROPERTIES.has(property);
        if (!isGap && !MARGIN_PROPERTIES.has(property)) return;
        if (!isAppliedStyle(node)) return;
        for (const leaf of collectLeaves(node.value)) {
          if (isGap ? isAllowedGap(leaf) : isAllowedMargin(leaf)) continue;
          context.report({
            node: leaf,
            messageId: isGap ? "gapStep" : "marginStep",
            data: { property, value: sourceCode.getText(leaf) },
          });
        }
      },
    };
  },
};

module.exports = requireRhythmSpacing;
