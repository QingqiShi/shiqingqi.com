/**
 * ESLint rule: no-unnecessary-use-prefix
 *
 * `@eslint-react/no-unnecessary-use-prefix`, with one more kind of hook call:
 * the one that the i18n Babel plugin adds.
 *
 * In a client module, the plugin opens each component or hook that calls
 * t() with `const _translations = useI18nTranslations()`. A `use` function
 * that calls t() and no other hook is therefore a hook after the transform,
 * but the base rule sees only the source before it. This rule runs the base
 * rule and drops its report on such a function. It finds them the way the
 * plugin does: a t() call belongs to the nearest enclosing function named as
 * a component or a hook, and a module is a client module when it has a
 * `"use client"` directive or exports only hooks.
 *
 * Out of a client module, the plugin changes t() into a lookup that calls no
 * hook, so the base rule's report stays.
 */

import eslintReact from "@eslint-react/eslint-plugin";
import { isClientModule } from "@tuja/module-exports";
import { wrapBaseRule } from "../wrap-base-rule.js";
import { createTImportTracker } from "./create-t-import-tracker.js";
import { findRenderFunction, getFunctionId } from "./is-render-function.js";

const baseRule = eslintReact.rules["no-unnecessary-use-prefix"];

/**
 * @param {Record<string, Function>} base
 * @param {Record<string, Function>} extra
 */
function mergeVisitors(base, extra) {
  const merged = { ...base };
  for (const [selector, handler] of Object.entries(extra)) {
    const baseHandler = base[selector];
    merged[selector] = baseHandler
      ? (/** @type {any} */ node) => {
          baseHandler(node);
          handler(node);
        }
      : handler;
  }
  return merged;
}

/** @type {import("eslint").Rule.RuleModule} */
const noUnnecessaryUsePrefix = {
  meta: {
    ...baseRule.meta,
    docs: {
      description:
        "Enforce that a function with the `use` prefix calls a hook, counting the `useI18nTranslations()` call that the i18n transform adds for t()",
    },
  },

  create(context) {
    const { tracker, handleImportDeclaration } = createTImportTracker();
    /** @type {any[]} */
    const tCalls = [];
    /** @type {import("eslint").Rule.ReportDescriptor[]} */
    const reports = [];

    const baseVisitors = wrapBaseRule(baseRule, context, (descriptor) => {
      reports.push(descriptor);
    });

    return mergeVisitors(
      /** @type {Record<string, Function>} */ (baseVisitors),
      {
        ImportDeclaration: handleImportDeclaration,

        CallExpression(/** @type {any} */ node) {
          if (
            tracker.imported &&
            node.callee.type === "Identifier" &&
            node.callee.name === tracker.localName
          ) {
            tCalls.push(node);
          }
        },

        "Program:exit"(/** @type {any} */ program) {
          if (reports.length === 0) return;
          /** @type {Set<any>} */
          const translating = new Set();
          if (isClientModule(program)) {
            for (const call of tCalls) {
              const fn = findRenderFunction(call);
              if (!fn) continue;
              translating.add(fn);
              translating.add(getFunctionId(fn));
            }
          }
          for (const descriptor of reports) {
            if ("node" in descriptor && translating.has(descriptor.node)) {
              continue;
            }
            context.report(descriptor);
          }
        },
      },
    );
  },
};

export default noUnnecessaryUsePrefix;
