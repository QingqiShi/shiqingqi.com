/**
 * ESLint rule: no-t-outside-render
 *
 * Prevents t() calls (from @tuja/i18n) outside React render scope.
 *
 * The i18n Babel plugin transforms client-side t() into a lookup in the
 * translations from a useI18nTranslations() hook call in the enclosing
 * component or hook; a helper gets them from its caller. So t() must run
 * during render. Even in server components, t() at module scope can read
 * the wrong locale. This rule enforces that t() only appears where React
 * keeps it reactive.
 *
 * Exception: modules marked `import "server-only"` transform t() into a
 * lookup that reads the locale fresh on every call (via a React `cache()`
 * store keyed per request), so the lookup can't go stale no matter which
 * function it's called from. This rule skips such modules entirely.
 */

"use strict";

const { createTImportTracker } = require("./create-t-import-tracker.js");
const {
  getEnclosingFunction,
  getFunctionName,
  isRenderFunction,
} = require("./is-render-function.js");

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
  return (
    isRenderFunction(fnNode) ||
    (getFunctionName(fnNode) === "generateMetadata" && isExported(fnNode))
  );
}

/** @type {import("eslint").Rule.RuleModule} */
const noTOutsideRender = {
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
    const { tracker, handleImportDeclaration } = createTImportTracker();
    let isServerOnlyModule = false;

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
        if (
          node.source.value === "server-only" &&
          node.specifiers.length === 0
        ) {
          isServerOnlyModule = true;
        }

        handleImportDeclaration(node);
      },

      CallExpression(node) {
        if (!tracker.imported) return;

        // Check if this is a t() call
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === tracker.localName
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
          node.callee.name !== tracker.localName
        ) {
          const calleeName = node.callee.name;
          if (!helperCallSites.has(calleeName)) {
            helperCallSites.set(calleeName, []);
          }
          helperCallSites.get(calleeName).push(node);
        }
      },

      "Program:exit"() {
        // "server-only" modules resolve t() fresh per request regardless of
        // which function it's called from — see the file-level comment.
        if (isServerOnlyModule) return;

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

module.exports = noTOutsideRender;
