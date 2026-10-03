// @ts-check

const nodePath = require("node:path");

const { isHookModule, isHookName } = require("@tuja/module-exports");
const { createContextWrapper } = require("./create-context-wrapper");
const { extractTranslations } = require("./extract-translations");
const { generateKey } = require("./generate-key");
const { hasParseOption } = require("./has-parse-option");
const { injectSetLocale } = require("./inject-set-locale");
const { isI18nModuleSource } = require("./is-i18n-module-source");
const { readManifest } = require("./read-manifest");

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
  state.isClientModule = false;
  state.usedLookup = false;
  state.usedLookupParse = false;
  state.tImportPath = null;
  state.__manifestEntry = null;
  state.hasSetLocaleImport = false;
  state.translationsOf = new Map();
  state.translationsHooks = [];

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
        state.isClientModule = true;
        break;
      }
    }
  }

  // A hook can only run inside a client component, so a module
  // whose value exports are all hooks is client code even with no
  // directive.
  if (!state.isClientModule) {
    state.isClientModule = isHookModule(path.node);
  }

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
    ? "#src/i18n/client-runtime.ts"
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
 * Auto-inject setLocale for server page/layout files under [locale].
 *
 * Next.js SSG can deduplicate renders when a function doesn't read
 * `params`. A page produces locale-dependent output in two ways:
 *   - it calls t() directly (usedLookup/usedLookupParse), or
 *   - it is a manifest-wrapped page whose injected
 *     ClientTranslationsProvider resolves its client bundle via
 *     getClientTranslations() → getLocale().
 * Either way the page must accept params and call setLocale(); otherwise
 * SSG can serve one locale's bundle on another route (e.g. English text
 * rendered on a /zh URL for a page that only renders client t() children).
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
        t.stringLiteral("#src/i18n/validate-locale.ts"),
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

// ── Client translations ──────────────────────────────────────────────────────

/**
 * A component or a hook, by the same names React and the
 * `no-t-outside-render` lint rule use.
 * @param {FunctionPath} fnPath
 * @returns {boolean}
 */
function isRenderFunction(fnPath) {
  const name = functionNameOf(fnPath);
  if (name === null) {
    return (
      fnPath.isFunctionDeclaration() &&
      fnPath.parentPath.isExportDefaultDeclaration()
    );
  }
  return /^[A-Z]/.test(name) || isHookName(name);
}

/**
 * @param {FunctionPath} fnPath
 * @returns {string | null}
 */
function functionNameOf(fnPath) {
  const node = fnPath.node;
  if (
    (fnPath.isFunctionDeclaration() || fnPath.isFunctionExpression()) &&
    node.id
  ) {
    return node.id.name;
  }
  const parent = fnPath.parentPath;
  if (parent?.isVariableDeclarator() && parent.node.id.type === "Identifier") {
    return parent.node.id.name;
  }
  return null;
}

/**
 * The nearest component or hook that encloses a path.
 * @param {import('@babel/traverse').NodePath} path
 * @returns {FunctionPath | null}
 */
function findRenderFunction(path) {
  for (
    let fn = path.getFunctionParent();
    fn;
    fn = fn.parentPath.getFunctionParent()
  ) {
    if (isRenderFunction(fn)) return fn;
  }
  return null;
}

/**
 * The identifier that holds the translations where a client t() call is.
 *
 * In a component or hook, it is a variable that the component or hook
 * declares at the top of its body from one `useI18nTranslations()` call.
 *
 * In a helper function that a component or hook calls, it is a new first
 * parameter, and each call of the helper passes the caller's translations.
 * React Compiler thinks that a call to a plain function is pure, so it
 * caches the helper's result by its arguments. The translations must be one
 * of them.
 *
 * @param {BabelTypes} t
 * @param {import('@babel/traverse').NodePath<import('@babel/types').CallExpression>} path
 * @param {PluginPass & I18nPluginState} state
 * @returns {import('@babel/types').Identifier}
 */
function translationsFor(t, path, state) {
  const renderFn = findRenderFunction(path);
  if (renderFn) return t.cloneNode(declaredTranslationsOf(renderFn, state));

  const helper = path.getFunctionParent();
  if (!helper) {
    throw tOutsideRenderError(
      path,
      "t() at module scope has no component or hook to read the translations in",
    );
  }

  const existing = state.translationsOf.get(helper.node);
  if (existing) return t.cloneNode(existing);

  const name = functionNameOf(helper);
  const binding =
    name === null ? undefined : helper.scope.parent?.getBinding(name);
  if (!binding || isExportedFunction(helper)) {
    throw tOutsideRenderError(
      path,
      "t() is in a function that is not a component, a hook, or a local helper that only components and hooks call",
    );
  }
  if (readsArguments(helper)) {
    throw tOutsideRenderError(
      path,
      `${name} reads \`arguments\`, so it cannot get the translations as a parameter`,
    );
  }

  const id = helper.scope.generateUidIdentifier("translations");
  state.translationsOf.set(helper.node, id);
  helper.node.params.unshift(id);

  for (const reference of binding.referencePaths) {
    const call = reference.parentPath;
    const isCall =
      call?.isCallExpression() && call.node.callee === reference.node;
    const caller = isCall ? findRenderFunction(call) : null;
    if (!isCall || !caller) {
      throw tOutsideRenderError(
        reference,
        `${name} calls t(), so only a component or a hook can call it`,
      );
    }
    call.node.arguments.unshift(
      t.cloneNode(declaredTranslationsOf(caller, state)),
    );
  }

  return t.cloneNode(id);
}

/**
 * @param {FunctionPath} renderFn
 * @param {PluginPass & I18nPluginState} state
 * @returns {import('@babel/types').Identifier}
 */
function declaredTranslationsOf(renderFn, state) {
  const existing = state.translationsOf.get(renderFn.node);
  if (existing) return existing;
  const id = renderFn.scope.generateUidIdentifier("translations");
  state.translationsOf.set(renderFn.node, id);
  state.translationsHooks.push({ id, fnPath: renderFn });
  return id;
}

/**
 * @param {FunctionPath} fnPath
 * @returns {boolean}
 */
function isExportedFunction(fnPath) {
  if (fnPath.parentPath.isExportDeclaration()) return true;
  return Boolean(
    fnPath.parentPath.isVariableDeclarator() &&
    fnPath.parentPath.parentPath?.parentPath?.isExportDeclaration(),
  );
}

/**
 * A new first parameter would move each index of `arguments`.
 * @param {FunctionPath} fnPath
 * @returns {boolean}
 */
function readsArguments(fnPath) {
  if (fnPath.isArrowFunctionExpression()) return false;
  let reads = false;
  fnPath.traverse({
    Function(inner) {
      if (!inner.isArrowFunctionExpression()) inner.skip();
    },
    Identifier(id) {
      if (id.node.name === "arguments" && id.isReferencedIdentifier()) {
        reads = true;
        id.stop();
      }
    },
  });
  return reads;
}

/**
 * @param {import('@babel/traverse').NodePath} path
 * @param {string} reason
 */
function tOutsideRenderError(path, reason) {
  return path.buildCodeFrameError(
    `${reason}. In a client module, t() reads the translations from React context, so it must run while a component renders.`,
  );
}

/**
 * Declare the translations at the top of each component or hook that uses
 * them. This runs after the traversal: a declaration in an arrow function
 * with an expression body changes the body into a block, which would move
 * the t() calls that the traversal still has to visit.
 * @param {BabelTypes} t
 * @param {PluginPass & I18nPluginState} state
 */
function declareTranslations(t, state) {
  for (const { id, fnPath } of state.translationsHooks) {
    fnPath.ensureBlock();
    const body = /** @type {import('@babel/types').BlockStatement} */ (
      fnPath.node.body
    );
    body.body.unshift(
      t.variableDeclaration("const", [
        t.variableDeclarator(
          id,
          t.callExpression(t.identifier("useI18nTranslations"), []),
        ),
      ]),
    );
  }
}
