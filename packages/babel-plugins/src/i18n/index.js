// @ts-check

const nodePath = require("node:path");

const { isClientModule } = require("@tuja/module-exports");
const { createContextWrapper } = require("./create-context-wrapper");
const { extractTranslations } = require("./extract-translations");
const { generateKey } = require("./generate-key");
const { hasParseOption } = require("./has-parse-option");
const { injectSetLocaleForPages } = require("./inject-set-locale-for-pages");
const { isI18nModuleSource } = require("./is-i18n-module-source");
const { readManifest } = require("./read-manifest");
const { declareTranslations, translationsFor } = require("./translations-for");

const defaultProjectRoot = process.cwd();

/**
 * @typedef {import('@babel/core')} Babel
 * @typedef {import('@babel/core').PluginPass} PluginPass
 * @typedef {import('@babel/core').types} BabelTypes
 */

/**
 * @typedef {{
 *   tLocalName: string | null,
 *   isClientModule: boolean,
 *   usedLookup: boolean,
 *   usedLookupParse: boolean,
 *   tImportPath: import('@babel/traverse').NodePath<import('@babel/types').ImportDeclaration> | null,
 *   __manifestEntry: string | null,
 *   hasSetLocaleImport: boolean,
 *   translationsOf: Map<import('@babel/types').Node, import('@babel/types').Identifier>,
 *   translationsHooks: { id: import('@babel/types').Identifier, fnPath: FunctionPath }[],
 * }} I18nPluginState
 * @typedef {import('@babel/traverse').NodePath<import('@babel/types').Function>} FunctionPath
 */

/**
 * A Babel plugin that transforms inline i18n `t()` calls into key-based lookups.
 *
 * - Server modules: `t({en:"Hello", zh:"你好"})` → `__i18n_lookup("key")`
 * - Client modules — files with `"use client"`, or files that export only
 *   hooks, since a hook can only run inside a client component —
 *   `t({en:"Hello", zh:"你好"})` → `i18nLookup(_translations, "key")`, where
 *   `const _translations = useI18nTranslations()` opens the enclosing
 *   component or hook
 * - With `{ parse: true }`: uses `__i18n_lookupParse` / `i18nLookupParse`
 * - Page/layout files in manifest: auto-wraps default export return with
 *   `<I18nContext value={{ translations: getClientTranslations() }}>`
 *
 * @param {Babel} babel
 * @param {{ manifestPath?: string, rootDir?: string }} [opts]
 * @returns {import('@babel/core').PluginObj<PluginPass & I18nPluginState>}
 */
module.exports = function i18nBabelPlugin({ types: t }, opts) {
  const projectRoot = opts?.rootDir || defaultProjectRoot;
  const manifestPath =
    opts?.manifestPath ||
    nodePath.join(projectRoot, "src/_generated/i18n/manifest.json");

  return {
    name: "i18n-transform",
    // React Compiler is first in Next's plugin list, and it compiles each
    // component in its Program visitor, before the visitors of all other
    // plugins. Babel runs the pre() of all plugins before all visitors, so
    // React Compiler reads the translations as a hook value, and not as a
    // t() call that it thinks is pure.
    pre(file) {
      transformProgram(t, file.path, this, { projectRoot, manifestPath });
    },
  };
};

/**
 * @param {BabelTypes} t
 * @param {import('@babel/traverse').NodePath<import('@babel/types').Program>} path
 * @param {PluginPass & I18nPluginState} state
 * @param {{ projectRoot: string, manifestPath: string }} options
 */
function transformProgram(t, path, state, { projectRoot, manifestPath }) {
  state.tLocalName = null;
  state.isClientModule = isClientModule(path.node);
  state.usedLookup = false;
  state.usedLookupParse = false;
  state.tImportPath = null;
  state.__manifestEntry = null;
  state.hasSetLocaleImport = false;
  state.translationsOf = new Map();
  state.translationsHooks = [];

  // Check if this file is a page/layout with client translations.
  // Read the manifest per-file (not once at plugin construction) so
  // the mtime cache in readManifest picks up codegen re-runs during a
  // running dev server. A long-lived plugin instance that captured the
  // manifest once would keep injecting a stale page→bundle mapping
  // after a route is renamed/added, poisoning newly compiled pages
  // with "Missing translation key" until `.next` is wiped.
  if (state.filename) {
    const manifest = readManifest(manifestPath);
    const relPath = nodePath.relative(projectRoot, state.filename);
    const entry = manifest[relPath];
    if (entry) {
      state.__manifestEntry = entry;
    }
  }

  for (const statement of path.get("body")) {
    if (!statement.isImportDeclaration()) continue;
    trackSetLocaleImport(t, statement, state);
    trackTImport(t, statement, state);
  }

  if (!state.tLocalName && !state.__manifestEntry) return;

  if (state.tLocalName) {
    path.traverse({
      CallExpression(callPath) {
        transformTCall(t, callPath, state);
      },
    });
  }

  declareTranslations(t, state);
  removeTImport(t, state);
  injectRuntimeImports(t, path, state);
  injectSetLocaleForPages(t, path, state, projectRoot);
  wrapWithI18nContext(t, path, state);

  // React Compiler resolves each identifier through Babel's scope data,
  // so the bindings this transform adds and removes must be in it.
  path.scope.crawl();
}

// ── Visitor helpers ──────────────────────────────────────────────────────────

/**
 * Remove the `t` specifier from its import declaration.
 * If other specifiers exist (e.g. `_setLocale`), keep the import.
 * @param {BabelTypes} t
 * @param {PluginPass & I18nPluginState} state
 */
function removeTImport(t, state) {
  if (!state.tImportPath) return;

  const specifiers = state.tImportPath.node.specifiers;
  if (specifiers.length <= 1) {
    state.tImportPath.remove();
  } else {
    const tIndex = specifiers.findIndex(
      (s) =>
        t.isImportSpecifier(s) && t.isIdentifier(s.imported, { name: "t" }),
    );
    if (tIndex !== -1) {
      specifiers.splice(tIndex, 1);
    }
  }
}

/**
 * Import the runtime functions that the rewritten t() calls use.
 * @param {BabelTypes} t
 * @param {import('@babel/traverse').NodePath<import('@babel/types').Program>} path
 * @param {PluginPass & I18nPluginState} state
 */
function injectRuntimeImports(t, path, state) {
  if (!state.usedLookup && !state.usedLookupParse) return;

  const { lookup, lookupParse } = lookupNames(state);
  /** @type {string[]} */
  const names = [];
  if (state.translationsHooks.length > 0) names.push("useI18nTranslations");
  if (state.usedLookup) names.push(lookup);
  if (state.usedLookupParse) names.push(lookupParse);

  const source = state.isClientModule
    ? "@tuja/i18n/client-runtime"
    : "#src/i18n/server-runtime.ts";

  // Directives ("use client") live in path.node.directives, separate
  // from body, so unshift always inserts after them in generated output.
  path.node.body.unshift(
    t.importDeclaration(
      names.map((name) =>
        t.importSpecifier(t.identifier(name), t.identifier(name)),
      ),
      t.stringLiteral(source),
    ),
  );
}

/**
 * Wrap the default export's return statements with I18nContext for
 * manifest-matched page/layout files.
 * @param {BabelTypes} t
 * @param {import('@babel/traverse').NodePath<import('@babel/types').Program>} path
 * @param {PluginPass & I18nPluginState} state
 */
function wrapWithI18nContext(t, path, state) {
  if (!state.__manifestEntry) return;

  const bundleName = state.__manifestEntry;

  path.node.body.unshift(
    t.importDeclaration(
      [
        t.importSpecifier(
          t.identifier("__I18nProvider"),
          t.identifier("ClientTranslationsProvider"),
        ),
      ],
      t.stringLiteral("@tuja/i18n/client-translations-provider"),
    ),
    t.importDeclaration(
      [
        t.importSpecifier(
          t.identifier("__getClientTx"),
          t.identifier("getClientTranslations"),
        ),
      ],
      t.stringLiteral(`#src/_generated/i18n/client-loaders/${bundleName}.ts`),
    ),
  );

  // Find the default export's function and wrap its return statements
  path.traverse({
    ExportDefaultDeclaration(exportPath) {
      const decl = exportPath.node.declaration;
      if (!t.isFunctionDeclaration(decl)) return;

      exportPath.traverse({
        // Skip nested functions so we only wrap the page/layout's own returns
        Function(fnPath) {
          if (fnPath.node !== decl) {
            fnPath.skip();
          }
        },
        ReturnStatement(returnPath) {
          const arg = returnPath.node.argument;
          if (!arg) return;
          returnPath.node.argument = createContextWrapper(t, arg);
        },
      });
    },
  });
}

/**
 * Track if setLocale is already imported by the user.
 * @param {BabelTypes} t
 * @param {import('@babel/traverse').NodePath<import('@babel/types').ImportDeclaration>} path
 * @param {PluginPass & I18nPluginState} state
 */
function trackSetLocaleImport(t, path, state) {
  if (path.node.source.value !== "@tuja/i18n/server-locale") return;

  for (const specifier of path.node.specifiers) {
    if (
      t.isImportSpecifier(specifier) &&
      t.isIdentifier(specifier.imported, { name: "setLocale" })
    ) {
      state.hasSetLocaleImport = true;
    }
  }
}

/**
 * Track the `t` import from @tuja/i18n.
 * @param {BabelTypes} t
 * @param {import('@babel/traverse').NodePath<import('@babel/types').ImportDeclaration>} path
 * @param {PluginPass & I18nPluginState} state
 */
function trackTImport(t, path, state) {
  if (!isI18nModuleSource(path.node.source.value)) return;

  // Find the `t` specifier (may be aliased)
  for (const specifier of path.node.specifiers) {
    if (
      t.isImportSpecifier(specifier) &&
      t.isIdentifier(specifier.imported, { name: "t" })
    ) {
      state.tLocalName = specifier.local.name;
      state.tImportPath = path;
      break;
    }
  }
}

/**
 * Transform a t() call into a runtime lookup call.
 * @param {BabelTypes} t
 * @param {import('@babel/traverse').NodePath<import('@babel/types').CallExpression>} path
 * @param {PluginPass & I18nPluginState} state
 */
function transformTCall(t, path, state) {
  if (!state.tLocalName) return;

  if (!t.isIdentifier(path.node.callee, { name: state.tLocalName })) return;

  // Verify this identifier actually resolves to our import binding
  const binding = path.scope.getBinding(state.tLocalName);
  if (!binding) return;

  const firstArg = path.node.arguments[0];
  if (!firstArg) return;

  const translations = extractTranslations(t, firstArg);
  if (!translations) {
    const loc = path.node.loc;
    const position = loc
      ? ` at ${state.filename ?? "<unknown>"}:${loc.start.line}:${loc.start.column}`
      : "";
    throw path.buildCodeFrameError(
      `Invalid t() call${position}: first argument must be an object with "en" and "zh" string literal properties. ` +
        `Template literals with interpolation are not supported — use the locale variable directly instead.`,
    );
  }

  const key = generateKey(translations.en, translations.zh);
  const secondArg = path.node.arguments[1];
  const isParse = hasParseOption(t, secondArg);

  if (isParse) {
    state.usedLookupParse = true;
  } else {
    state.usedLookup = true;
  }

  const names = lookupNames(state);
  /** @type {import('@babel/types').Expression[]} */
  const args = [t.stringLiteral(key)];
  if (state.isClientModule) args.unshift(translationsFor(t, path, state));
  path.replaceWith(
    t.callExpression(
      t.identifier(isParse ? names.lookupParse : names.lookup),
      args,
    ),
  );
}

/**
 * @param {PluginPass & I18nPluginState} state
 */
function lookupNames(state) {
  return state.isClientModule
    ? { lookup: "i18nLookup", lookupParse: "i18nLookupParse" }
    : { lookup: "__i18n_lookup", lookupParse: "__i18n_lookupParse" };
}
