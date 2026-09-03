/**
 * A hook can run only inside a client component. So a module whose value
 * exports are all hooks is client code. The module is never a
 * server/client seam, even with no `"use client"` directive.
 *
 * A barrel is not a hook module. `export * from` makes a module the
 * function cannot judge. A module with no value exports is not a hook
 * module.
 *
 * The function accepts an ESTree `Program` node (typescript-eslint) or a
 * Babel `Program` node.
 */

"use strict";

const { valueExportNamesOf } = require("./value-export-names-of");

const HOOK_NAME = /^use[A-Z0-9]/;

/**
 * @param {any} program
 * @returns {boolean}
 */
function isHookModule(program) {
  const names = valueExportNamesOf(program);
  return (
    names !== null &&
    names.length > 0 &&
    names.every((name) => HOOK_NAME.test(name))
  );
}

module.exports = { isHookModule };
