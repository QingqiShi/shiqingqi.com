/**
 * A client module is a module with a `"use client"` directive, or a hook
 * module (see `is-hook-module.js`).
 *
 * The functions accept an ESTree `Program` node (typescript-eslint) or a
 * Babel `Program` node. ESTree keeps the directive prologue in `body` as
 * `ExpressionStatement` nodes with a `directive` field. Babel keeps it in
 * `directives` as `Directive` nodes.
 */

"use strict";

const { isHookModule } = require("./is-hook-module");

/**
 * The `"use client"` directive statement of a module, or null.
 * @param {any} program
 * @returns {any}
 */
function findUseClientDirective(program) {
  if (program.directives !== undefined) {
    return (
      program.directives.find(
        (/** @type {any} */ directive) =>
          directive.value.value === "use client",
      ) ?? null
    );
  }
  for (const statement of program.body) {
    if (
      statement.type !== "ExpressionStatement" ||
      typeof statement.directive !== "string"
    ) {
      return null;
    }
    if (statement.directive === "use client") return statement;
  }
  return null;
}

/**
 * @param {any} program
 * @returns {boolean}
 */
function isClientModule(program) {
  return findUseClientDirective(program) !== null || isHookModule(program);
}

module.exports = { findUseClientDirective, isClientModule };
