"use strict";

const { isComponentOrHookName } = require("@tuja/module-exports");

/**
 * @param {import("eslint").Rule.Node} node
 * @returns {boolean}
 */
function isFunction(node) {
  return (
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression"
  );
}

/**
 * The nearest function that encloses a node.
 * @param {import("eslint").Rule.Node} node
 * @returns {import("eslint").Rule.Node | null}
 */
function getEnclosingFunction(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (isFunction(current)) return current;
  }
  return null;
}

/**
 * The identifier that names a function: its own name, or the variable it
 * initialises.
 * @param {import("eslint").Rule.Node} fnNode
 * @returns {import("estree").Identifier | null}
 */
function getFunctionId(fnNode) {
  if ("id" in fnNode && fnNode.id) return fnNode.id;
  if (
    fnNode.parent.type === "VariableDeclarator" &&
    fnNode.parent.id.type === "Identifier"
  ) {
    return fnNode.parent.id;
  }
  return null;
}

/**
 * @param {import("eslint").Rule.Node} fnNode
 * @returns {string | null}
 */
function getFunctionName(fnNode) {
  return getFunctionId(fnNode)?.name ?? null;
}

/**
 * Whether a function is a component or a hook. An anonymous
 * `export default function` is a component.
 * @param {import("eslint").Rule.Node} fnNode
 * @returns {boolean}
 */
function isRenderFunction(fnNode) {
  const name = getFunctionName(fnNode);
  if (name === null) {
    return (
      fnNode.type === "FunctionDeclaration" &&
      fnNode.parent.type === "ExportDefaultDeclaration"
    );
  }
  return isComponentOrHookName(name);
}

/**
 * The nearest component or hook that encloses a node.
 * @param {import("eslint").Rule.Node} node
 * @returns {import("eslint").Rule.Node | null}
 */
function findRenderFunction(node) {
  for (let fn = getEnclosingFunction(node); fn; fn = getEnclosingFunction(fn)) {
    if (isRenderFunction(fn)) return fn;
  }
  return null;
}

module.exports = {
  findRenderFunction,
  getEnclosingFunction,
  getFunctionId,
  getFunctionName,
  isRenderFunction,
};
