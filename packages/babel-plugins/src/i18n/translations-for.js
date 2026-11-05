// @ts-check

const { isComponentOrHookName } = require("@tuja/module-exports");

/**
 * @typedef {import('@babel/core').PluginPass} PluginPass
 * @typedef {import('@babel/core').types} BabelTypes
 * @typedef {import('./index').I18nPluginState} I18nPluginState
 * @typedef {import('./index').FunctionPath} FunctionPath
 */

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
  return isComponentOrHookName(name);
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

module.exports = { declareTranslations, translationsFor };
