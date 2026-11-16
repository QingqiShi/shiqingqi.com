// @ts-check

/**
 * @typedef {import('@babel/core')} Babel
 * @typedef {import('@babel/core').PluginPass} PluginPass
 */

/**
 * A Babel plugin that replaces each use of `DEV` from `esm-env` with a
 * boolean literal, and removes the import.
 *
 * `esm-env` gets `DEV` from the package export conditions, so the value is
 * correct without this plugin. But Turbopack does not inline a constant that
 * comes from another module's default export, so it keeps every branch that
 * `DEV` guards in the production bundle. With a literal in its place, the
 * bundler removes the branch and the modules that only the branch imports.
 *
 * @param {Babel} babel - The Babel object.
 * @returns {import('@babel/core').PluginObject<PluginPass & { opts: { dev?: boolean } }>}
 */
function inlineEsmEnv({ types: t }) {
  return {
    name: "inline-esm-env",
    visitor: {
      ImportDeclaration(path, state) {
        if (path.node.source.value !== "esm-env") return;
        for (const specifier of path.get("specifiers")) {
          if (!specifier.isImportSpecifier()) continue;
          const { imported, local } = specifier.node;
          const importedName = t.isIdentifier(imported)
            ? imported.name
            : imported.value;
          if (importedName !== "DEV") continue;
          const binding = path.scope.getBinding(local.name);
          if (!binding) continue;
          for (const reference of binding.referencePaths) {
            reference.replaceWith(t.booleanLiteral(Boolean(state.opts.dev)));
          }
          specifier.remove();
        }
        if (path.node.specifiers.length === 0) path.remove();
      },
    },
  };
}

module.exports = inlineEsmEnv;
