// @ts-check

/**
 * The role a highlighted run plays.
 *
 * @typedef {"plain"
 *   | "keyword"
 *   | "string"
 *   | "comment"
 *   | "number"
 *   | "tag"
 *   | "component"
 *   | "attr"
 *   | "property"
 *   | "punct"} CodeTokenKind
 */

/**
 * One highlighted run: its kind and its text.
 *
 * @typedef {[CodeTokenKind, string]} CodeToken
 */

/**
 * Every kind, in declaration order. The app declares the same list and a test
 * asserts the two agree.
 *
 * @type {readonly CodeTokenKind[]}
 */
const TOKEN_KINDS = Object.freeze([
  "plain",
  "keyword",
  "string",
  "comment",
  "number",
  "tag",
  "component",
  "attr",
  "property",
  "punct",
]);

module.exports = { TOKEN_KINDS };
