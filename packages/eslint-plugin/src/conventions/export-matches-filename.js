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
 * Both module systems are read: `export`/`export default` and their CommonJS
 * equivalents `module.exports = name`, `module.exports = { a, b }`, and
 * `exports.name = ...`.
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

/**
 * The names a single top-level statement exports.
 * @param {any} node
 * @returns {string[]}
 */
function exportedNamesOf(node) {
  const names = [];
  switch (node.type) {
    case "ExportNamedDeclaration": {
      const declaration = node.declaration;
      if (declaration?.type === "VariableDeclaration") {
        for (const declarator of declaration.declarations) {
          collectPatternNames(declarator.id, names);
        }
      } else if (declaration?.id?.type === "Identifier") {
        names.push(declaration.id.name);
      }
      for (const specifier of node.specifiers) {
        const name = exportedNameOf(specifier);
        if (name !== null) names.push(name);
      }
      return names;
    }
    case "ExportDefaultDeclaration": {
      const declaration = node.declaration;
      if (declaration.type === "Identifier") {
        names.push(declaration.name);
      } else if (declaration.id?.type === "Identifier") {
        names.push(declaration.id.name);
      }
      return names;
    }
    default:
      return names;
  }
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
        const names = [];
        for (const node of program.body) {
          if (node.type === "ExportAllDeclaration") return;
          if (EXPORT_TYPES.has(node.type)) {
            exportStatements.push(node);
            names.push(...exportedNamesOf(node));
            continue;
          }
          const commonjsNames = commonjsExportedNamesOf(node);
          if (commonjsNames === null) continue;
          exportStatements.push(node);
          names.push(...commonjsNames);
        }
        if (exportStatements.length === 0) return;
        if (names.some((name) => normalise(name) === wanted)) return;

        context.report({
          node: exportStatements[0],
          messageId: "noMatchingExport",
          data: {
            basename,
            stem,
            exports: names.length > 0 ? names.join(", ") : "none named",
          },
        });
      },
    };
  },
};

module.exports = exportMatchesFilename;
