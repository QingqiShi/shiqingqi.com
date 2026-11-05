// @ts-check

const { tokenise } = require("./tokenise");

/**
 * @typedef {typeof import("@babel/types")} BabelTypes
 * @typedef {import("@babel/types").JSXAttribute} JSXAttribute
 * @typedef {import("@babel/types").Expression} Expression
 * @typedef {import("@babel/traverse").NodePath} AnyPath
 * @typedef {import("./token-kinds").CodeToken} CodeToken
 */

/**
 * Marks the place of a translated text in a snippet until the tokeniser has
 * split the snippet. The site source does not use private-use characters.
 */
const HOLE = /\uE000(\d+)\uE001/;

/**
 * @param {number} index
 */
function holeMarker(index) {
  return `\uE000${index}\uE001`;
}

/**
 * Tokenise a snippet. Source that Babel cannot read fails with a code frame
 * that points at the element holding it.
 *
 * @param {string} source
 * @param {AnyPath} elementPath
 * @returns {CodeToken[]}
 */
function tokeniseAt(source, elementPath) {
  try {
    return tokenise(source);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    const framed = elementPath.buildCodeFrameError(error.message);
    framed.cause = error;
    throw framed;
  }
}

/**
 * @param {BabelTypes} t
 * @param {CodeToken[]} tokens
 * @param {Expression[]} holes The `t()` calls that fill the holes in `tokens`.
 * @returns {JSXAttribute}
 */
function sourceAttribute(t, tokens, holes) {
  return t.jsxAttribute(
    t.jsxIdentifier("source"),
    t.jsxExpressionContainer(
      t.arrayExpression(
        tokens.map(([kind, text]) =>
          t.arrayExpression([t.stringLiteral(kind), tokenText(t, text, holes)]),
        ),
      ),
    ),
  );
}

/**
 * The text of one token, with each hole filled by its `t()` call.
 *
 * @param {BabelTypes} t
 * @param {string} text
 * @param {Expression[]} holes
 * @returns {Expression}
 */
function tokenText(t, text, holes) {
  const pieces = text.split(new RegExp(HOLE.source, "g"));
  /** @type {Expression[]} */
  const parts = [];
  pieces.forEach((piece, index) => {
    if (index % 2 === 1) parts.push(t.cloneNode(holes[Number(piece)]));
    else if (piece !== "") parts.push(t.stringLiteral(piece));
  });
  if (parts.length === 0) return t.stringLiteral("");
  return parts.reduce((left, right) => t.binaryExpression("+", left, right));
}

module.exports = { holeMarker, sourceAttribute, tokeniseAt };
