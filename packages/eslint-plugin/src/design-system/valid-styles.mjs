/**
 * ESLint rule: valid-styles
 *
 * `@stylexjs/valid-styles`, without two kinds of false report:
 *
 * - A value that is a `stylex.firstThatWorks()` call. The base rule checks
 *   most values only as literals, so it rejects the call. It also skips the
 *   token references that are the usual arguments, so this rule does not
 *   check the arguments again.
 * - A condition key that starts with `:is(`, `:where(` or `:not(`. The base
 *   rule's list of pseudo-classes does not have them, but StyleX compiles
 *   them. The key can be a string, or a `const` that a string initialises.
 *
 * All other reports of the base rule stay as they are. The rule takes the
 * options of the base rule.
 */

import { rules as stylexRules } from "@stylexjs/eslint-plugin";
import { wrapBaseRule } from "../wrap-base-rule.js";
import { findVariable } from "./find-variable.js";
import { getStaticKey, getStaticString } from "./get-static-key.js";
import { isStylexCall } from "./is-stylex-call.js";

const baseRule = stylexRules["valid-styles"];

const INVALID_CONDITION_MESSAGE =
  "Invalid Pseudo class or At Rule used for conditional style value";

const COMPILED_SELECTOR_PREFIXES = [":is(", ":where(", ":not("];

/**
 * @param {import("eslint").SourceCode} sourceCode
 * @param {any} property
 * @returns {string | null}
 */
function resolveKey(sourceCode, property) {
  const key = getStaticKey(property);
  if (key !== null || !property.computed) return key;
  if (property.key.type !== "Identifier") return null;
  const variable = findVariable(sourceCode, property.key);
  const definition = variable?.defs[0];
  if (
    variable?.defs.length !== 1 ||
    definition?.type !== "Variable" ||
    definition.parent.kind !== "const" ||
    definition.node.init == null
  ) {
    return null;
  }
  return getStaticString(definition.node.init);
}

/** @type {import("eslint").Rule.RuleModule} */
const validStyles = {
  meta: {
    ...baseRule.meta,
    docs: {
      description:
        "Enforce valid StyleX styles, accepting `stylex.firstThatWorks()` values and `:is()`, `:where()` and `:not()` conditions",
    },
  },

  create(context) {
    /** @param {any} descriptor */
    function isFalseReport(descriptor) {
      const { node } = descriptor;
      if (isStylexCall(node, "firstThatWorks")) {
        return node.arguments.every(
          (/** @type {any} */ argument) => argument.type !== "SpreadElement",
        );
      }
      if (
        node?.type !== "ObjectExpression" ||
        node.parent.type !== "Property" ||
        descriptor.message !== INVALID_CONDITION_MESSAGE
      ) {
        return false;
      }
      const key = resolveKey(context.sourceCode, node.parent);
      return (
        key !== null &&
        COMPILED_SELECTOR_PREFIXES.some((prefix) => key.startsWith(prefix))
      );
    }

    return wrapBaseRule(baseRule, context, (descriptor) => {
      if (!isFalseReport(descriptor)) context.report(descriptor);
    });
  },
};

export default validStyles;
