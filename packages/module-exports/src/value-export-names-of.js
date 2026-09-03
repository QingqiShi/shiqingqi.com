/**
 * The value exports of a module: the runtime bindings `export` and
 * `export default` introduce, with every type-only export left out.
 *
 * The same code reads two different ASTs: an ESTree AST from
 * typescript-eslint (used by ESLint rules) and a Babel AST (used by Babel
 * plugins). The two ASTs disagree on two node shapes: an object-pattern
 * property is `Property` in ESTree and `ObjectProperty` in Babel, and a
 * string-literal export name is `Literal` in ESTree and `StringLiteral` in
 * Babel. Both cases are handled below.
 */

"use strict";

/**
 * Collect every identifier a binding pattern introduces, so
 * `export const { a, b } = x` contributes both names.
 * @param {any} pattern
 * @param {string[]} names
 */
function collectPatternNames(pattern, names) {
  if (!pattern) return;
  switch (pattern.type) {
    case "Identifier": {
      names.push(pattern.name);
      return;
    }
    case "ObjectPattern": {
      for (const property of pattern.properties) {
        collectPatternNames(
          property.type === "Property" || property.type === "ObjectProperty"
            ? property.value
            : property.argument,
          names,
        );
      }
      return;
    }
    case "ArrayPattern": {
      for (const element of pattern.elements) {
        collectPatternNames(element, names);
      }
      return;
    }
    case "AssignmentPattern": {
      collectPatternNames(pattern.left, names);
      return;
    }
    case "RestElement": {
      collectPatternNames(pattern.argument, names);
      return;
    }
    default:
  }
}

/**
 * The exported name of one export specifier. Both ASTs always set
 * `exported` on an export specifier.
 * @param {any} specifier
 * @returns {string | null}
 */
function exportedNameOf(specifier) {
  const exported = specifier.exported;
  if (exported.type === "Identifier") return exported.name;
  if (typeof exported.value === "string") return exported.value;
  return null;
}

// A type alias, an interface, and an ambient (`declare`) function are all
// compile-time-only declarations, never a runtime value.
const NON_VALUE_DECLARATION_TYPES = new Set([
  "TSTypeAliasDeclaration",
  "TSInterfaceDeclaration",
  "TSDeclareFunction",
]);

/**
 * The names one `ExportNamedDeclaration` exports as runtime values.
 * @param {any} node
 * @param {string[]} names
 */
function collectNamedValueExports(node, names) {
  if (node.exportKind === "type") return;
  const declaration = node.declaration;
  if (declaration) {
    if (NON_VALUE_DECLARATION_TYPES.has(declaration.type)) return;
    if (declaration.type === "VariableDeclaration") {
      for (const declarator of declaration.declarations) {
        collectPatternNames(declarator.id, names);
      }
    } else if (declaration.id?.type === "Identifier") {
      names.push(declaration.id.name);
    }
    return;
  }
  for (const specifier of node.specifiers) {
    if (specifier.exportKind === "type") continue;
    const name = exportedNameOf(specifier);
    if (name !== null) names.push(name);
  }
}

/**
 * The name one `ExportDefaultDeclaration` exports as a runtime value. An
 * anonymous default export names nothing, so it counts as `"default"`, a
 * name no hook can have.
 * @param {any} node
 * @returns {string}
 */
function defaultValueExportNameOf(node) {
  const declaration = node.declaration;
  if (declaration.type === "Identifier") return declaration.name;
  if (declaration.id?.type === "Identifier") return declaration.id.name;
  return "default";
}

/**
 * Every top-level value export of a `Program` node, or `null` when an
 * `ExportAllDeclaration` (`export * from`) makes the module a barrel this
 * function cannot judge.
 *
 * Accepts either an ESTree `Program` node (typescript-eslint) or a Babel
 * `Program` node.
 * @param {any} program
 * @returns {string[] | null}
 */
function valueExportNamesOf(program) {
  const names = [];
  for (const node of program.body) {
    switch (node.type) {
      case "ExportAllDeclaration": {
        return null;
      }
      case "ExportNamedDeclaration": {
        collectNamedValueExports(node, names);
        break;
      }
      case "ExportDefaultDeclaration": {
        names.push(defaultValueExportNameOf(node));
        break;
      }
      default:
    }
  }
  return names;
}

module.exports = { valueExportNamesOf };
