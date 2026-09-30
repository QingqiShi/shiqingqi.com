// @ts-check

/**
 * Tell if an import source is the module that exports `t`: the
 * `#src/i18n` subpath import, with or without `.ts`, or a relative path
 * to that module.
 * @param {unknown} source
 * @returns {boolean}
 */
function isI18nModuleSource(source) {
  // Turbopack can change `#src/i18n` to a relative path such as
  // `../../i18n.ts` before Babel gets the AST. Thus accept each path
  // that ends in `/i18n`.
  return typeof source === "string" && /\/i18n(?:\.ts)?$/.test(source);
}

module.exports = { isI18nModuleSource };
