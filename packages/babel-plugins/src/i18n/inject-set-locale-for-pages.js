// @ts-check

const nodePath = require("node:path");

const { injectSetLocale } = require("./inject-set-locale");

/**
 * @typedef {import('@babel/core').PluginPass} PluginPass
 * @typedef {import('@babel/core').types} BabelTypes
 * @typedef {import('./index').I18nPluginState} I18nPluginState
 */

/**
 * Auto-inject setLocale for server page/layout files under [locale].
 *
 * The locale store defaults to "en", and Next renders the segments of a
 * route as concurrent tasks. A page or layout that reads the locale before
 * some other segment sets it renders English on a /zh URL, and the static
 * build keeps that HTML. So each page and layout that produces
 * locale-dependent output sets the locale itself. It does so in two ways:
 *   - it calls t() directly (usedLookup/usedLookupParse), or
 *   - it is a manifest-wrapped file whose injected
 *     ClientTranslationsProvider resolves its client bundle via
 *     getClientTranslations() → getLocale().
 * Reading `params` also tells Next that the output varies by locale, so
 * SSG and the client segment cache keep one copy per locale.
 *
 * This targets two kinds of functions:
 *   1. `export default function` in page/layout files
 *   2. `export function generateMetadata` in page/layout files
 *
 * @param {BabelTypes} t
 * @param {import('@babel/traverse').NodePath<import('@babel/types').Program>} path
 * @param {PluginPass & I18nPluginState} state
 * @param {string} projectRoot
 */
function injectSetLocaleForPages(t, path, state, projectRoot) {
  const producesLocaleDependentOutput =
    state.usedLookup || state.usedLookupParse || Boolean(state.__manifestEntry);

  if (
    !producesLocaleDependentOutput ||
    state.isClientModule ||
    state.hasSetLocaleImport ||
    !state.filename
  ) {
    return;
  }

  const basename = nodePath.basename(state.filename);
  const relPath = nodePath.relative(projectRoot, state.filename);
  const isPageOrLayoutFile = /^(page|layout)\.[jt]sx?$/.test(basename);
  const isUnderLocale = relPath.includes("[locale]");

  if (!isPageOrLayoutFile || !isUnderLocale) return;

  let needsImports = false;

  path.traverse({
    ExportDefaultDeclaration(exportPath) {
      const decl = exportPath.node.declaration;
      if (!t.isFunctionDeclaration(decl)) return;

      injectSetLocale(t, decl);
      needsImports = true;
    },

    ExportNamedDeclaration(exportPath) {
      const decl = exportPath.node.declaration;
      if (
        !t.isFunctionDeclaration(decl) ||
        !decl.id ||
        decl.id.name !== "generateMetadata"
      ) {
        return;
      }

      injectSetLocale(t, decl);
      needsImports = true;
    },
  });

  if (needsImports) {
    path.node.body.unshift(
      t.importDeclaration(
        [
          t.importSpecifier(
            t.identifier("__setLocale"),
            t.identifier("setLocale"),
          ),
        ],
        t.stringLiteral("@tuja/i18n/server-locale"),
      ),
      t.importDeclaration(
        [
          t.importSpecifier(
            t.identifier("__validateLocale"),
            t.identifier("validateLocale"),
          ),
        ],
        t.stringLiteral("@tuja/i18n/validate-locale"),
      ),
    );
  }
}

module.exports = { injectSetLocaleForPages };
