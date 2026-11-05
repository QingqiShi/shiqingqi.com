"use strict";

const { findVariable } = require("./find-variable");
const { getStaticKey, getStaticString } = require("./get-static-key");
const { isAppliedStyle } = require("./is-applied-style");
const { isStylexCall } = require("./is-stylex-call");

/** The names of a block size, as a StyleX key and as a CSS property. */
const LAYOUT_SIZE_KEYS = new Set([
  "height",
  "minHeight",
  "maxHeight",
  "blockSize",
  "minBlockSize",
  "maxBlockSize",
  "min-height",
  "max-height",
  "block-size",
  "min-block-size",
  "max-block-size",
]);

/** The same names as whole words in a value, so not `line-height` or `--height`. */
const LAYOUT_SIZE_IN_VALUE =
  /(?<![\w-])(?:(?:min-|max-)?(?:height|block-size)|(?:min|max)(?:Height|BlockSize)|blockSize)(?![\w-])/;

const TRANSITION_KEYS = new Set(["transition", "transitionProperty"]);

const POSE_KEYS = new Set(["pose", "reducedPose"]);

const BINDING_CALLS = new Set(["useBinding", "bind"]);

const OPTIONS_ARGUMENT = 2;

const TYPE_WRAPPERS = new Set([
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "TSTypeAssertion",
]);

const FUNCTION_TYPES = new Set([
  "ArrowFunctionExpression",
  "FunctionExpression",
  "FunctionDeclaration",
]);

/** @param {import("estree").Node} node */
function unwrap(node) {
  let inner = node;
  while (TYPE_WRAPPERS.has(inner.type)) inner = inner.expression;
  return inner;
}

/** @param {import("eslint").Rule.Node} property */
function isInKeyframes(property) {
  let node = property.parent;
  while (
    node != null &&
    (node.type === "ObjectExpression" || node.type === "Property")
  ) {
    node = node.parent;
  }
  return isStylexCall(node, "keyframes");
}

/** @type {import("eslint").Rule.RuleModule} */
const noLayoutAnimation = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Refuse animations of `height` and `block-size`, which lay out the page on each frame",
    },
    messages: {
      transition:
        "This transition moves `{{name}}`, which lays out the page on each frame and can drop frames. Keep the size static: change it at once, and move what lies below with `translate` through `FlowBlock` or `useFlowBlock`.",
      keyframes:
        "This keyframe moves `{{name}}`, which lays out the page on each frame and can drop frames. Keep the size static: change it at once, and move what lies below with `translate` through `FlowBlock` or `useFlowBlock`.",
      pose: "This pose moves `{{name}}`, which lays out the page on each frame and can drop frames. Keep the size static: change it at once, and move what lies below with `translate` through `FlowBlock` or `useFlowBlock`.",
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode;

    /**
     * What a name in this file always refers to: the function it declares,
     * or the initial value of a `const`.
     * @param {import("estree").Identifier} identifier
     * @returns {import("estree").Node | null}
     */
    function resolve(identifier) {
      const definition = findVariable(sourceCode, identifier)?.defs[0];
      if (definition === undefined) return null;
      if (definition.type === "FunctionName") return definition.node;
      if (
        definition.type === "Variable" &&
        definition.parent.kind === "const" &&
        definition.node.id === definition.name
      ) {
        return definition.node.init;
      }
      return null;
    }

    /**
     * The expressions a function returns, without those of the functions it
     * holds.
     * @param {import("estree").Function} fn
     * @returns {import("estree").Expression[]}
     */
    function returnsOf(fn) {
      if (fn.body.type !== "BlockStatement") return [fn.body];
      /** @type {import("estree").Expression[]} */
      const found = [];
      /** @param {import("estree").Node} node */
      const visit = (node) => {
        if (FUNCTION_TYPES.has(node.type)) return;
        if (node.type === "ReturnStatement") {
          if (node.argument != null) found.push(node.argument);
          return;
        }
        for (const key of sourceCode.visitorKeys[node.type] ?? []) {
          for (const child of [node[key]].flat()) {
            if (child != null) visit(child);
          }
        }
      };
      visit(fn.body);
      return found;
    }

    const resolving = new Set();

    /**
     * The strings that make up a value, each with the node to report: an
     * array, a fallback list, a conditional object or a template. A name
     * reports where the style uses it.
     * @param {import("estree").Node} value
     * @param {import("estree").Node} [reportAt]
     * @returns {{ text: string, node: import("estree").Node }[]}
     */
    function stringsIn(value, reportAt) {
      const node = unwrap(value);
      const literal = getStaticString(node);
      if (literal !== null) return [{ text: literal, node: reportAt ?? node }];

      /** @param {import("estree").Node} child */
      const within = (child) => stringsIn(child, reportAt);
      switch (node.type) {
        case "TemplateLiteral":
          return [
            ...node.quasis.map((quasi) => ({
              text: quasi.value.cooked ?? "",
              node: reportAt ?? node,
            })),
            ...node.expressions.flatMap(within),
          ];
        case "ArrayExpression":
          return node.elements.flatMap((item) =>
            item === null ? [] : within(item),
          );
        case "ObjectExpression":
          return node.properties.flatMap((property) =>
            property.type === "Property" ? within(property.value) : [],
          );
        case "ConditionalExpression":
          return [node.consequent, node.alternate].flatMap(within);
        case "LogicalExpression":
        case "BinaryExpression":
          return [node.left, node.right].flatMap(within);
        case "CallExpression":
          return isStylexCall(node, "firstThatWorks")
            ? node.arguments.flatMap(within)
            : [];
        case "Identifier": {
          const init = resolve(node);
          if (init === null || resolving.has(init)) return [];
          resolving.add(init);
          const strings = stringsIn(init, reportAt ?? node);
          resolving.delete(init);
          return strings;
        }
        default:
          return [];
      }
    }

    /** @param {import("estree").Property} property */
    function checkTransition(property) {
      for (const { text, node } of stringsIn(property.value)) {
        const match = LAYOUT_SIZE_IN_VALUE.exec(text);
        if (match === null) continue;
        context.report({
          node,
          messageId: "transition",
          data: { name: match[0] },
        });
      }
    }

    const seenPoses = new Set();
    const seenStyles = new Set();

    /**
     * The function in this file that a call runs, or null.
     * @param {import("estree").CallExpression} call
     */
    function localCallee(call) {
      if (call.callee.type !== "Identifier") return null;
      const target = resolve(call.callee);
      return target !== null && FUNCTION_TYPES.has(target.type) ? target : null;
    }

    /**
     * Follows a value that gives a pose function: the function, a name of
     * one, or a local factory that returns one. A function from another file
     * or from a parameter cannot be read here, so it ends the walk.
     * @param {import("estree").Node} value
     */
    function checkPose(value) {
      const node = unwrap(value);
      if (seenPoses.has(node)) return;
      seenPoses.add(node);
      if (FUNCTION_TYPES.has(node.type)) {
        returnsOf(node).forEach(checkPoseStyles);
      } else if (node.type === "Identifier") {
        const target = resolve(node);
        if (target !== null) checkPose(target);
      } else if (node.type === "CallExpression") {
        const callee = localCallee(node);
        if (callee !== null) returnsOf(callee).forEach(checkPose);
      } else if (node.type === "ConditionalExpression") {
        checkPose(node.consequent);
        checkPose(node.alternate);
      }
    }

    /**
     * Reports the block sizes in the styles that a pose returns.
     * @param {import("estree").Node} value
     */
    function checkPoseStyles(value) {
      const node = unwrap(value);
      if (seenStyles.has(node)) return;
      seenStyles.add(node);
      if (node.type === "ObjectExpression") {
        for (const property of node.properties) {
          if (property.type === "SpreadElement") {
            checkPoseStyles(property.argument);
            continue;
          }
          const key = getStaticKey(property);
          if (key === null || !LAYOUT_SIZE_KEYS.has(key)) continue;
          context.report({
            node: property.key,
            messageId: "pose",
            data: { name: key },
          });
        }
      } else if (node.type === "Identifier") {
        const target = resolve(node);
        if (target !== null) checkPoseStyles(target);
      } else if (node.type === "CallExpression") {
        const callee = localCallee(node);
        if (callee !== null) returnsOf(callee).forEach(checkPoseStyles);
      } else if (node.type === "ConditionalExpression") {
        checkPoseStyles(node.consequent);
        checkPoseStyles(node.alternate);
      } else if (node.type === "LogicalExpression") {
        checkPoseStyles(node.left);
        checkPoseStyles(node.right);
      }
    }

    return {
      Property(node) {
        const key = getStaticKey(node);
        if (key === null) return;
        if (LAYOUT_SIZE_KEYS.has(key) && isInKeyframes(node)) {
          context.report({
            node: node.key,
            messageId: "keyframes",
            data: { name: key },
          });
          return;
        }
        if (
          TRANSITION_KEYS.has(key) &&
          isAppliedStyle(node, { dynamic: true })
        ) {
          checkTransition(node);
        }
      },

      CallExpression(node) {
        if (
          node.callee.type !== "Identifier" ||
          !BINDING_CALLS.has(node.callee.name)
        ) {
          return;
        }
        const argument = node.arguments[OPTIONS_ARGUMENT];
        if (argument === undefined) return;
        const unwrapped = unwrap(argument);
        const options =
          unwrapped.type === "Identifier" ? resolve(unwrapped) : unwrapped;
        if (options?.type !== "ObjectExpression") return;
        for (const property of options.properties) {
          if (property.type !== "Property") continue;
          const key = getStaticKey(property);
          if (key !== null && POSE_KEYS.has(key)) checkPose(property.value);
        }
      },
    };
  },
};

module.exports = noLayoutAnimation;
