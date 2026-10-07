"use strict";

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

module.exports = { getTokenGroup, collectLeaves };
