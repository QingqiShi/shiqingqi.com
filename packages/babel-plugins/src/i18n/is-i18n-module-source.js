// @ts-check

/**
 * Tell if an import source is the module that exports `t`: the
 * `@tuja/i18n` package, or a relative path to its `i18n.ts`.
 * @param {unknown} source
 * @returns {boolean}
 */
function isI18nModuleSource(source) {
  // Turbopack can change an import to a relative path such as
  // `../../i18n.ts` before Babel gets the AST. Thus accept each path
  // that ends in `/i18n`.
  return typeof source === "string" && /\/i18n(?:\.ts)?$/.test(source);
}

module.exports = { isI18nModuleSource };
