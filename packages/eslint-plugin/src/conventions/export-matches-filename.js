/**
 * ESLint rule: export-matches-filename
 *
 * A file is named after the thing it exports: `merge-refs.ts` exports
 * `mergeRefs`, `option-card.tsx` exports `OptionCard`, `featured-creatures.ts`
 * exports `FEATURED_CREATURES`. Both sides are normalised — every
 * non-alphanumeric character is stripped and the rest is lowercased — so the
 * case convention of the export is free.
 *
 * The file stem is the basename up to the first dot, so `button.stylex.ts`
 * matches `button` and `foo.test.ts` matches `foo`.
 *
 * Every export is a value export or a type export: `export interface X`,
 * `export type X = ...`, `export type { X }`, `export default interface X`,
 * and an inline specifier such as `export { type X }` are type exports;
 * everything else is a value export. When the file has at least one value
 * export statement, only the value exports are checked against the stem,
 * and a type export can never satisfy the rule. An unnamed
 * `export default <expression>` counts as a value export statement. When
 * every export in the file is a type export, the type exports are checked
 * instead.
 *
 * Both module systems are read: `export`/`export default` and their CommonJS
 * equivalents `module.exports = name`, `module.exports = { a, b }`, and
 * `exports.name = ...`. A CommonJS export is always a value export, since
 * CommonJS has no concept of types.
 *
 * A file with no exports passes (entry scripts), and so does a file with an
 * `export * from` (a barrel cannot be judged). A whole category of files is
 * exempted in the ESLint config through `files`/`ignores`; a single file is
 * exempted by an inline disable that states its reason. The rule takes no
 * options.
 */

"use strict";

const path = require("node:path");

/**
 * @param {string} name
 * @returns {string}
 */
function normalise(name) {
  return name.replaceAll(/[^a-z0-9]/gi, "").toLowerCase();
}

/**
 * @param {string} basename
 * @returns {string}
 */
function stemOf(basename) {
  return basename.split(".")[0] ?? "";
}

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
          property.type === "Property" ? property.value : property.argument,
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
 * @param {any} specifier
 * @returns {string | null}
 */
function exportedNameOf(specifier) {
  const exported = specifier.exported;
  if (!exported) return null;
  if (exported.type === "Identifier") return exported.name;
  if (typeof exported.value === "string") return exported.value;
  return null;
}

// A type alias and an interface are compile-time-only declarations, never a
// runtime value. `export default interface X {}` never gets exportKind
// "type" (only a named export does), so a default export is checked against
// this set as well.
const NON_VALUE_DECLARATION_TYPES = new Set([
  "TSTypeAliasDeclaration",
  "TSInterfaceDeclaration",
]);

/**
 * Whether an export node, or one of its specifiers, is type-only.
 * `exportKind` is set by typescript-eslint for a named type export
 * (`export type X`, `export interface X`, `export type { X }`) and for an
 * inline specifier (`export { type X }`). Espree, used for CommonJS
 * tooling, has no concept of types and never sets `exportKind`, so
 * undefined counts as a value export.
 * @param {any} node
 * @returns {boolean}
 */
function isTypeOnly(node) {
  if (node.exportKind === "type") return true;
  return (
    node.type === "ExportDefaultDeclaration" &&
    NON_VALUE_DECLARATION_TYPES.has(node.declaration.type)
  );
}

/**
 * Split the names one `ExportNamedDeclaration` or `ExportDefaultDeclaration`
 * exports into `valueNames` and `typeNames`.
 * @param {any} node
 * @param {string[]} valueNames
 * @param {string[]} typeNames
 * @returns {boolean} whether the statement exports a value: an unnamed
 *   `export default <expression>` does, and `export { type X }` does not
 */
function collectExportedNames(node, valueNames, typeNames) {
  const typeOnly = isTypeOnly(node);

  if (node.type === "ExportDefaultDeclaration") {
    const declaration = node.declaration;
    let name = null;
    if (declaration.type === "Identifier") {
      name = declaration.name;
    } else if (declaration.id?.type === "Identifier") {
      name = declaration.id.name;
    }
    if (typeOnly) {
      if (name !== null) typeNames.push(name);
      return false;
    }
    if (name !== null) valueNames.push(name);
    return true;
  }

  const declaration = node.declaration;
  const declared = [];
  if (declaration?.type === "VariableDeclaration") {
    for (const declarator of declaration.declarations) {
      collectPatternNames(declarator.id, declared);
    }
  } else if (declaration?.id?.type === "Identifier") {
    declared.push(declaration.id.name);
  }
  (typeOnly ? typeNames : valueNames).push(...declared);
  let hasValueName = !typeOnly && declared.length > 0;

  for (const specifier of node.specifiers) {
    const name = exportedNameOf(specifier);
    if (name === null) continue;
    if (typeOnly || isTypeOnly(specifier)) {
      typeNames.push(name);
    } else {
      valueNames.push(name);
      hasValueName = true;
    }
  }

  return hasValueName;
}

const EXPORT_TYPES = new Set([
  "ExportNamedDeclaration",
  "ExportDefaultDeclaration",
  "ExportAllDeclaration",
]);

/**
 * Whether the node is the member expression `module.exports`.
 * @param {any} node
 * @returns {boolean}
 */
function isModuleExports(node) {
  return (
    node.type === "MemberExpression" &&
    !node.computed &&
    node.object.type === "Identifier" &&
    node.object.name === "module" &&
    node.property.type === "Identifier" &&
    node.property.name === "exports"
  );
}

/**
 * The names the right-hand side of `module.exports = ...` introduces: the
 * identifier itself, or the keys of an object literal.
 * @param {any} node
 * @returns {string[]}
 */
function assignedNamesOf(node) {
  if (node.type === "Identifier") return [node.name];
  if (node.type !== "ObjectExpression") return [];
  const names = [];
  for (const property of node.properties) {
    if (property.type !== "Property" || property.computed) continue;
    if (property.key.type === "Identifier") {
      names.push(property.key.name);
    } else if (typeof property.key.value === "string") {
      names.push(property.key.value);
    }
  }
  return names;
}

/**
 * The names a single top-level statement exports through CommonJS, or null
 * when it is not a CommonJS export at all.
 * @param {any} node
 * @returns {string[] | null}
 */
function commonjsExportedNamesOf(node) {
  if (node.type !== "ExpressionStatement") return null;
  const assignment = node.expression;
  if (
    assignment.type !== "AssignmentExpression" ||
    assignment.operator !== "="
  ) {
    return null;
  }
  const target = assignment.left;
  if (
    target.type !== "MemberExpression" ||
    target.computed ||
    target.property.type !== "Identifier"
  ) {
    return null;
  }
  if (isModuleExports(target)) return assignedNamesOf(assignment.right);
  const isNamedExport =
    isModuleExports(target.object) ||
    (target.object.type === "Identifier" && target.object.name === "exports");
  return isNamedExport ? [target.property.name] : null;
}

/** @type {import("eslint").Rule.RuleModule} */
const exportMatchesFilename = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require a file to export something named after the file itself",
    },
    messages: {
      noMatchingExport:
        'Name the file after its main export: no export in "{{basename}}" matches "{{stem}}" (exports: {{exports}}).',
    },
    schema: [],
  },

  create(context) {
    return {
      "Program:exit"(program) {
        const basename = path.basename(context.filename);
        const stem = stemOf(basename);
        if (stem === "") return;
        const wanted = normalise(stem);

        const exportStatements = [];
        const valueNames = [];
        const typeNames = [];
        let hasValueExportStatement = false;
        for (const node of program.body) {
          if (node.type === "ExportAllDeclaration") return;
          if (EXPORT_TYPES.has(node.type)) {
            exportStatements.push(node);
            if (collectExportedNames(node, valueNames, typeNames)) {
              hasValueExportStatement = true;
            }
            continue;
          }
          const commonjsNames = commonjsExportedNamesOf(node);
          if (commonjsNames === null) continue;
          exportStatements.push(node);
          valueNames.push(...commonjsNames);
          hasValueExportStatement = true;
        }
        if (exportStatements.length === 0) return;

        const judgedNames = hasValueExportStatement ? valueNames : typeNames;
        if (judgedNames.some((name) => normalise(name) === wanted)) return;

        let exportsText =
          judgedNames.length > 0 ? judgedNames.join(", ") : "none named";
        if (hasValueExportStatement && typeNames.length > 0) {
          exportsText += ` (type-only exports do not count: ${typeNames.join(", ")})`;
        }

        context.report({
          node: exportStatements[0],
          messageId: "noMatchingExport",
          data: {
            basename,
            stem,
            exports: exportsText,
          },
        });
      },
    };
  },
};

module.exports = exportMatchesFilename;
