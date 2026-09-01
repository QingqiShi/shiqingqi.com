/**
 * Shared `t` import detection for i18n lint rules.
 *
 * Recognizes `import { t } from "#src/i18n"` (and its `.ts`-suffixed and
 * relative-path source forms) and tracks the local name `t` is imported as,
 * so a rule can recognize `t()` calls even when the import is aliased.
 */

"use strict";

/** @param {unknown} source */
function isI18nModuleSource(source) {
  return (
    source === "#src/i18n" ||
    source === "#src/i18n.ts" ||
    (typeof source === "string" && /\/i18n(?:\.ts)?$/.test(source))
  );
}

/**
 * Creates a tracker for the `t` import. Feed it every `ImportDeclaration`
 * node via `handleImportDeclaration`; read `tracker.imported` and
 * `tracker.localName` afterward to recognize `t()` calls.
 */
function createTImportTracker() {
  const tracker = {
    imported: false,
    localName: "t",
  };

  /** @param {import("eslint").Rule.Node} node */
  function handleImportDeclaration(node) {
    if (!isI18nModuleSource(node.source.value)) return;

    for (const specifier of node.specifiers) {
      if (
        specifier.type === "ImportSpecifier" &&
        specifier.imported.type === "Identifier" &&
        specifier.imported.name === "t"
      ) {
        tracker.imported = true;
        tracker.localName = specifier.local.name;
      }
    }
  }

  return { tracker, handleImportDeclaration };
}

module.exports = { createTImportTracker };
