/**
 * ESLint rule: no-t-outside-render
 *
 * Prevents t() calls (from #src/i18n) outside React render scope.
 *
 * The i18n Babel plugin transforms client-side t() into useI18nLookup(),
 * which is a React hook and must run during render. Even in server components,
 * t() at module scope can read the wrong locale. This rule enforces that t()
 * only appears where React keeps it reactive.
 */

"use strict";

/** @param {string} name */
function isComponentName(name) {
  return /^[A-Z]/.test(name);
}

/** @param {string} name */
function isHookName(name) {
  return /^use[A-Z]/.test(name);
}

/**
 * Walk up from a node to find the nearest enclosing function.
 * @param {import("eslint").Rule.Node} node
 * @returns {import("eslint").Rule.Node | null}
 */
function getEnclosingFunction(node) {
  let current = node.parent;
  while (current) {
    if (
      current.type === "FunctionDeclaration" ||
      current.type === "FunctionExpression" ||
      current.type === "ArrowFunctionExpression"
    ) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

/**
 * Check if a function node is a callback argument or assigned to a JSX event attribute.
 * This catches useEffect(() => ...), onClick={() => ...}, arr.map(() => ...), etc.
 * @param {import("eslint").Rule.Node} fnNode
 * @returns {boolean}
 */
function isCallbackOrEventHandler(fnNode) {
  const parent = fnNode.parent;

  // Arrow/function expression passed as argument to a call: foo(() => ...)
  if (parent.type === "CallExpression" && parent.arguments.includes(fnNode)) {
    return true;
  }

  // Arrow/function expression in JSX expression container for event attribute: onClick={() => ...}
  if (parent.type === "JSXExpressionContainer") {
    const attr = parent.parent;
    if (attr.type === "JSXAttribute") {
      return true;
    }
  }

  return false;
}

/**
 * Get the name of a function node, if it has one.
 * @param {import("eslint").Rule.Node} fnNode
 * @returns {string | null}
 */
function getFunctionName(fnNode) {
  if (fnNode.type === "FunctionDeclaration" && fnNode.id) {
    return fnNode.id.name;
  }
  // Variable declarator: const foo = () => {} or const foo = function() {}
  if (
    fnNode.parent.type === "VariableDeclarator" &&
    fnNode.parent.id.type === "Identifier"
  ) {
    return fnNode.parent.id.name;
  }
  return null;
}

/**
 * Check if a function node is exported.
 * @param {import("eslint").Rule.Node} fnNode
 * @returns {boolean}
 */
function isExported(fnNode) {
  if (fnNode.type === "FunctionDeclaration") {
    const parent = fnNode.parent;
    return (
      parent.type === "ExportNamedDeclaration" ||
      parent.type === "ExportDefaultDeclaration"
    );
  }
  // Variable: export const foo = () => {}
  if (
    fnNode.parent.type === "VariableDeclarator" &&
    fnNode.parent.parent.type === "VariableDeclaration"
  ) {
    return fnNode.parent.parent.parent.type === "ExportNamedDeclaration";
  }
  return false;
}

/**
 * Check if a function is a render-scope function (component, hook, or generateMetadata).
 * @param {import("eslint").Rule.Node} fnNode
 * @returns {boolean}
 */
function isRenderScopeFunction(fnNode) {
  const name = getFunctionName(fnNode);
  if (!name) {
    // export default function() {} — anonymous default export is a component
    if (
      fnNode.type === "FunctionDeclaration" &&
      fnNode.parent.type === "ExportDefaultDeclaration"
    ) {
      return true;
    }
    return false;
  }

  if (isComponentName(name) || isHookName(name)) {
    return true;
  }

  // generateMetadata is whitelisted
  if (name === "generateMetadata" && isExported(fnNode)) {
    return true;
  }

  return false;
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow t() calls outside React render scope (components, hooks, generateMetadata)",
    },
    messages: {
      outsideRender:
        "t() used outside render scope. t() must be called directly in a React component body, custom hook, or generateMetadata(). Move the translation to render scope so it stays reactive when the locale changes.",
    },
    schema: [],
  },

  create(context) {
    let tImported = false;
    let tLocalName = "t";

    // t() calls that need deferred resolution (in non-exported helper functions)
    // Key: helper function name, Value: array of t() call nodes
    /** @type {Map<string, import("eslint").Rule.Node[]>} */
    const deferredTCalls = new Map();

    // All call sites of helper functions
    // Key: function name, Value: array of call-site nodes
    /** @type {Map<string, import("eslint").Rule.Node[]>} */
    const helperCallSites = new Map();

    // t() calls that are definitely errors
    /** @type {import("eslint").Rule.Node[]} */
    const errorCalls = [];

    // Set of helper function names we need to track
    /** @type {Set<string>} */
    const helperNames = new Set();

    /**
     * Classify a t() call. Returns "allowed", "error", or the helper function name for deferred resolution.
     * @param {import("eslint").Rule.Node} callNode
     * @returns {"allowed" | "error" | string}
     */
    function classifyTCall(callNode) {
      const enclosingFn = getEnclosingFunction(callNode);

      // Module scope — no enclosing function
      if (!enclosingFn) {
        return "error";
      }

      // If the immediate enclosing function is a callback/event handler, error
      if (
        (enclosingFn.type === "ArrowFunctionExpression" ||
          enclosingFn.type === "FunctionExpression") &&
        isCallbackOrEventHandler(enclosingFn)
      ) {
        return "error";
      }

      // Check if the enclosing function is itself a render-scope function
      if (isRenderScopeFunction(enclosingFn)) {
        return "allowed";
      }

      const name = getFunctionName(enclosingFn);

      // Anonymous function that's not a callback and not render-scope — error
      if (!name) {
        return "error";
      }

      // Exported non-component/non-hook function — error
      if (isExported(enclosingFn)) {
        return "error";
      }

      // Non-exported, non-component, non-hook named function — defer
      return name;
    }

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (
          source === "#src/i18n" ||
          source === "#src/i18n.ts" ||
          (typeof source === "string" && /\/i18n(?:\.ts)?$/.test(source))
        ) {
          for (const specifier of node.specifiers) {
            if (
              specifier.type === "ImportSpecifier" &&
              specifier.imported.type === "Identifier" &&
              specifier.imported.name === "t"
            ) {
              tImported = true;
              tLocalName = specifier.local.name;
            }
          }
        }
      },

      CallExpression(node) {
        if (!tImported) return;

        // Check if this is a t() call
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === tLocalName
        ) {
          const result = classifyTCall(node);
          if (result === "error") {
            errorCalls.push(node);
          } else if (result !== "allowed") {
            // Deferred — result is the helper function name
            helperNames.add(result);
            if (!deferredTCalls.has(result)) {
              deferredTCalls.set(result, []);
            }
            deferredTCalls.get(result).push(node);
          }
          return;
        }

        // Track call sites of helper functions: helperName()
        if (
          node.callee.type === "Identifier" &&
          node.callee.name !== tLocalName
        ) {
          const calleeName = node.callee.name;
          if (!helperCallSites.has(calleeName)) {
            helperCallSites.set(calleeName, []);
          }
          helperCallSites.get(calleeName).push(node);
        }
      },

      "Program:exit"() {
        // Report definite errors
        for (const node of errorCalls) {
          context.report({ node, messageId: "outsideRender" });
        }

        // Resolve deferred calls
        for (const [helperName, tCallNodes] of deferredTCalls) {
          const callSites = helperCallSites.get(helperName);

          if (!callSites || callSites.length === 0) {
            // No call sites found — can't verify it's called from render scope
            for (const node of tCallNodes) {
              context.report({ node, messageId: "outsideRender" });
            }
            continue;
          }

          // Check if every call site is a direct call in render scope
          let allInRenderScope = true;
          for (const callSite of callSites) {
            const callSiteFn = getEnclosingFunction(callSite);

            if (!callSiteFn) {
              allInRenderScope = false;
              break;
            }

            // If the call site's enclosing function is a callback, not render scope
            if (
              (callSiteFn.type === "ArrowFunctionExpression" ||
                callSiteFn.type === "FunctionExpression") &&
              isCallbackOrEventHandler(callSiteFn)
            ) {
              allInRenderScope = false;
              break;
            }

            if (!isRenderScopeFunction(callSiteFn)) {
              allInRenderScope = false;
              break;
            }
          }

          if (!allInRenderScope) {
            for (const node of tCallNodes) {
              context.report({ node, messageId: "outsideRender" });
            }
          }
        }
      },
    };
  },
};
