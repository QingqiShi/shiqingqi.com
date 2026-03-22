// @ts-check

const nodePath = require("node:path");

const {
  createContextWrapper,
  extractTranslations,
  hasParseOption,
  injectSetLocale,
} = require("./ast-utils");
const { generateKey } = require("./generate-key");
const { defaultProjectRoot, readManifest } = require("./manifest");

/**
 * @typedef {import('@babel/core')} Babel
 * @typedef {import('@babel/core').PluginPass} PluginPass
 * @typedef {import('@babel/core').types} BabelTypes
 */

/**
 * @typedef {{
 *   tLocalName: string | null,
 *   isClientComponent: boolean,
 *   usedLookup: boolean,
 *   usedLookupParse: boolean,
 *   tImportPath: import('@babel/traverse').NodePath<import('@babel/types').ImportDeclaration> | null,
 *   __manifestEntry: string | null,
 *   hasSetLocaleImport: boolean,
 * }} I18nPluginState
 */

/**
 * A Babel plugin that transforms inline i18n `t()` calls into key-based lookups.
 *
 * - Server components: `t({en:"Hello", zh:"你好"})` → `__i18n_lookup("key")`
 * - Client components: `t({en:"Hello", zh:"你好"})` → `useI18nLookup("key")`
 * - With `{ parse: true }`: uses `__i18n_lookupParse` / `useI18nLookupParse`
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
  const manifest = readManifest(manifestPath);

  return {
    name: "i18n-transform",
    visitor: {
      Program: {
        enter(path, state) {
          state.tLocalName = null;
          state.isClientComponent = false;
          state.usedLookup = false;
          state.usedLookupParse = false;
          state.tImportPath = null;
          state.__manifestEntry = null;
          state.hasSetLocaleImport = false;

          // Detect "use client" directive
          // Babel parses directives (like "use strict", "use client") into
          // path.node.directives rather than the body as ExpressionStatements.
          const directives = path.node.directives;
          if (directives && directives.length > 0) {
            for (const directive of directives) {
              if (
                t.isDirective(directive) &&
                t.isDirectiveLiteral(directive.value) &&
                directive.value.value === "use client"
              ) {
                state.isClientComponent = true;
                break;
              }
            }
          }

          // Check if this file is a page/layout with client translations
          if (state.filename) {
            const relPath = nodePath.relative(projectRoot, state.filename);
            const entry = manifest[relPath];
            if (entry) {
              state.__manifestEntry = entry;
            }
          }
        },

        exit(path, state) {
          removeTImport(t, state);
          injectRuntimeImports(t, path, state);
          injectSetLocaleForPages(t, path, state, projectRoot);
          wrapWithI18nContext(t, path, state);
        },
      },

      ImportDeclaration(path, state) {
        trackSetLocaleImport(t, path, state);
        trackTImport(t, path, state);
      },

      CallExpression(path, state) {
        transformTCall(t, path, state);
      },
    },
  };
};

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
 * Inject runtime import for __i18n_lookup / useI18nLookup.
 * @param {BabelTypes} t
 * @param {import('@babel/traverse').NodePath<import('@babel/types').Program>} path
 * @param {PluginPass & I18nPluginState} state
 */
function injectRuntimeImports(t, path, state) {
  if (!state.usedLookup && !state.usedLookupParse) return;

  const lookupName = state.isClientComponent
    ? "useI18nLookup"
    : "__i18n_lookup";
  const lookupParseName = state.isClientComponent
    ? "useI18nLookupParse"
    : "__i18n_lookupParse";

  /** @type {import('@babel/types').ImportSpecifier[]} */
  const specifiers = [];
  if (state.usedLookup) {
    specifiers.push(
      t.importSpecifier(t.identifier(lookupName), t.identifier(lookupName)),
    );
  }
  if (state.usedLookupParse) {
    specifiers.push(
      t.importSpecifier(
        t.identifier(lookupParseName),
        t.identifier(lookupParseName),
      ),
    );
  }

  const source = state.isClientComponent
    ? "#src/i18n/client-runtime.ts"
    : "#src/i18n/server-runtime.ts";

  // Directives ("use client") live in path.node.directives, separate
  // from body, so unshift always inserts after them in generated output.
  path.node.body.unshift(
    t.importDeclaration(specifiers, t.stringLiteral(source)),
  );
}

/**
 * Auto-inject setLocale for server page/layout files under [locale].
 *
 * Next.js SSG can deduplicate renders when a function doesn't read
 * `params`. Any function with t() calls produces locale-dependent
 * output, so it must accept params and call setLocale().
 *
 * This targets two kinds of functions:
 *   1. `export default function` in page files
 *   2. `export function generateMetadata` in page/layout files
 *
 * @param {BabelTypes} t
 * @param {import('@babel/traverse').NodePath<import('@babel/types').Program>} path
 * @param {PluginPass & I18nPluginState} state
 * @param {string} projectRoot
 */
function injectSetLocaleForPages(t, path, state, projectRoot) {
  if (
    (!state.usedLookup && !state.usedLookupParse) ||
    state.isClientComponent ||
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

      // Only inject into page default exports (layouts typically
      // read params manually for routing/validation purposes).
      if (!/^page\.[jt]sx?$/.test(basename)) return;

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
        t.stringLiteral("#src/i18n/server-locale.ts"),
      ),
      t.importDeclaration(
        [
          t.importSpecifier(
            t.identifier("__validateLocale"),
            t.identifier("validateLocale"),
          ),
        ],
        t.stringLiteral("#src/utils/validate-locale.ts"),
      ),
    );
  }
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
      t.stringLiteral("#src/i18n/client-translations-provider.tsx"),
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
  if (
    path.node.source.value !== "#src/i18n/server-locale.ts" &&
    path.node.source.value !== "#src/i18n/server-locale"
  ) {
    return;
  }

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
 * Track the `t` import from #src/i18n.
 * @param {BabelTypes} t
 * @param {import('@babel/traverse').NodePath<import('@babel/types').ImportDeclaration>} path
 * @param {PluginPass & I18nPluginState} state
 */
function trackTImport(t, path, state) {
  const source = path.node.source.value;
  // Match both the original subpath import (#src/i18n) and resolved
  // relative paths (e.g. ../../i18n.ts) that Turbopack may produce
  // before Babel sees the AST.
  if (
    source !== "#src/i18n" &&
    source !== "#src/i18n.ts" &&
    !source.match(/\/i18n(?:\.ts)?$/)
  ) {
    return;
  }

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
    console.warn(
      `[i18n-babel-plugin] Invalid t() call: first argument must be an object with "en" and "zh" string literal properties.`,
    );
    return;
  }

  const key = generateKey(translations.en, translations.zh);
  const secondArg = path.node.arguments[1];
  const isParse = hasParseOption(t, secondArg);

  /** @type {string} */
  let funcName;
  if (state.isClientComponent) {
    funcName = isParse ? "useI18nLookupParse" : "useI18nLookup";
  } else {
    funcName = isParse ? "__i18n_lookupParse" : "__i18n_lookup";
  }

  if (isParse) {
    state.usedLookupParse = true;
  } else {
    state.usedLookup = true;
  }

  path.replaceWith(
    t.callExpression(t.identifier(funcName), [t.stringLiteral(key)]),
  );
}
