"use strict";

const fs = require("node:fs");
const { resolvePackageRelative } = require("./resolve-package-relative");

/**
 * @typedef {{ exact: Set<string>, wildcards: { prefix: string, suffix: string }[] }} ExportTargets
 */

/** @type {Map<string, { mtimeMs: number, targets: ExportTargets | null }>} */
const cacheByPackageJson = new Map();

/** `"./src/foo.ts"` -> `"src/foo.ts"` */
function normalizeTarget(target) {
  return target.startsWith("./") ? target.slice(2) : target;
}

/**
 * Every file path a subpath maps to, through any conditional export.
 * @param {unknown} target
 * @returns {string[]}
 */
function collectPaths(target) {
  if (typeof target === "string") return [target];
  if (typeof target !== "object" || target === null) return [];
  return Object.values(target).flatMap((nested) => collectPaths(nested));
}

/**
 * @param {string} packageJsonPath
 * @returns {ExportTargets | null} `null` when the package declares no exports map.
 */
function readExportTargets(packageJsonPath) {
  // Keyed on the manifest's modification time, so an editor's long-lived lint
  // process sees an edited exports map.
  const { mtimeMs } = fs.statSync(packageJsonPath);
  const cached = cacheByPackageJson.get(packageJsonPath);
  if (cached !== undefined && cached.mtimeMs === mtimeMs) return cached.targets;

  const manifest = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const exportsField = manifest.exports;
  /** @type {ExportTargets | null} */
  let targets = null;

  if (
    typeof exportsField === "object" &&
    exportsField !== null &&
    !Array.isArray(exportsField)
  ) {
    targets = { exact: new Set(), wildcards: [] };
    for (const targetPath of Object.values(exportsField).flatMap((target) =>
      collectPaths(target),
    )) {
      const normalized = normalizeTarget(targetPath);
      const starIndex = normalized.indexOf("*");
      if (starIndex === -1) {
        targets.exact.add(normalized);
      } else {
        targets.wildcards.push({
          prefix: normalized.slice(0, starIndex),
          suffix: normalized.slice(starIndex + 1),
        });
      }
    }
  }

  cacheByPackageJson.set(packageJsonPath, { mtimeMs, targets });
  return targets;
}

const INTERNAL_TAG = /@internal\b/;

const EXPORT_STATEMENTS = new Set([
  "ExportNamedDeclaration",
  "ExportDefaultDeclaration",
  "ExportAllDeclaration",
]);

/**
 * The JSDoc block directly above an export that tags it `@internal`.
 * @param {import("eslint").SourceCode} sourceCode
 * @param {import("eslint").Rule.Node} node
 * @returns {import("estree").Comment | null}
 */
function findInternalComment(sourceCode, node) {
  const blocks = sourceCode
    .getCommentsBefore(node)
    .filter((comment) => comment.type === "Block");
  const nearest = blocks.at(-1);
  return nearest !== undefined && INTERNAL_TAG.test(nearest.value)
    ? nearest
    : null;
}

/**
 * A statement that exports something. `export {}` only marks a module.
 * @param {import("eslint").Rule.Node} node
 * @returns {boolean}
 */
function isExportStatement(node) {
  if (!EXPORT_STATEMENTS.has(node.type)) return false;
  return (
    node.type !== "ExportNamedDeclaration" ||
    node.declaration != null ||
    node.specifiers.length > 0
  );
}

/** @type {import("eslint").Rule.RuleModule} */
const requirePackageExport = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require every export to be reachable through its package's exports map, or tagged `@internal` in its own JSDoc",
    },
    messages: {
      notExported:
        "This export is in `{{file}}`, which this package's exports map does not reach, so nothing outside the package can import it. Add the module to package.json, or tag the export `@internal` in its JSDoc.",
      staleInternal:
        "Every export of `{{file}}` is `@internal`, yet the exports map reaches it, so the module is public. Remove the exports entry, or the tags.",
    },
    schema: [],
  },

  create(context) {
    return {
      Program(node) {
        const location = resolvePackageRelative(context.filename);
        if (location === null) return;

        const targets = readExportTargets(location.packageJsonPath);
        if (targets === null) return;

        const { sourceCode } = context;
        const exportStatements = node.body
          .filter((statement) => isExportStatement(statement))
          .map((statement) => ({
            statement,
            internalComment: findInternalComment(sourceCode, statement),
          }));
        if (exportStatements.length === 0) return;

        const { relative } = location;
        const isExported =
          targets.exact.has(relative) ||
          targets.wildcards.some(
            ({ prefix, suffix }) =>
              relative.length >= prefix.length + suffix.length &&
              relative.startsWith(prefix) &&
              relative.endsWith(suffix),
          );

        if (isExported) {
          if (
            exportStatements.every(
              ({ internalComment }) => internalComment !== null,
            )
          ) {
            const [first] = exportStatements;
            context.report({
              loc: first.internalComment.loc,
              messageId: "staleInternal",
              data: { file: relative },
            });
          }
          return;
        }

        for (const { statement, internalComment } of exportStatements) {
          if (internalComment !== null) continue;
          context.report({
            node: statement,
            messageId: "notExported",
            data: { file: relative },
          });
        }
      },
    };
  },
};

module.exports = requirePackageExport;
