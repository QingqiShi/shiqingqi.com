"use strict";

/**
 * A fix that removes a node together with the whitespace after it, so the
 * file continues at the next token or comment.
 * @param {import("eslint").Rule.RuleFixer} fixer
 * @param {import("eslint").SourceCode} sourceCode
 * @param {import("eslint").Rule.Node} node
 * @returns {import("eslint").Rule.Fix}
 */
function removeWithTrailingWhitespace(fixer, sourceCode, node) {
  const text = sourceCode.text;
  let end = node.range[1];
  while (end < text.length && /\s/.test(text[end])) end++;
  return fixer.removeRange([node.range[0], end]);
}

module.exports = { removeWithTrailingWhitespace };
