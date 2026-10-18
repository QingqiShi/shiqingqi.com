"use strict";

/**
 * Runs the visitors of a third-party rule, and sends each of its reports to
 * `report` instead of to ESLint.
 * @param {import("eslint").Rule.RuleModule} baseRule
 * @param {import("eslint").Rule.RuleContext} context
 * @param {(descriptor: import("eslint").Rule.ReportDescriptor) => void} report
 * @returns {import("eslint").Rule.RuleListener}
 */
function wrapBaseRule(baseRule, context, report) {
  return baseRule.create(Object.create(context, { report: { value: report } }));
}

module.exports = { wrapBaseRule };
