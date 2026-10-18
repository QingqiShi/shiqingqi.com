"use strict";

/**
 * The variable an identifier refers to, from its own scope up to the module
 * scope, or null.
 * @param {import("eslint").SourceCode} sourceCode
 * @param {import("estree").Identifier} identifier
 * @returns {import("eslint").Scope.Variable | null}
 */
function findVariable(sourceCode, identifier) {
  for (
    let scope = sourceCode.getScope(identifier);
    scope != null;
    scope = scope.upper
  ) {
    const variable = scope.set.get(identifier.name);
    if (variable !== undefined) return variable;
  }
  return null;
}

module.exports = { findVariable };
