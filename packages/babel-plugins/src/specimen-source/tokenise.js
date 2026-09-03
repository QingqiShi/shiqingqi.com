// @ts-check

const { parseSync, traverse, types: t } = require("@babel/core");

/**
 * @typedef {import("./token-kinds").CodeTokenKind} CodeTokenKind
 * @typedef {import("./token-kinds").CodeToken} CodeToken
 * @typedef {import("@babel/types").File} File
 * @typedef {import("@babel/types").Node} Node
 * @typedef {import("@babel/types").JSXIdentifier
 *   | import("@babel/types").JSXMemberExpression
 *   | import("@babel/types").JSXNamespacedName} JSXName
 */

/**
 * What Babel puts on a token: a bare label, or the record that holds one.
 *
 * @typedef {string | { label: string; keyword?: string | null }} TokenType
 */

/**
 * @typedef {object} Parsed
 * @property {File} ast
 * @property {number[]} separators Offsets where a `;` replaced one
 *   whitespace character.
 */

/** Contextual keywords, which Babel lexes as plain names. */
const SOFT_KEYWORDS = new Set([
  "abstract",
  "as",
  "asserts",
  "async",
  "await",
  "declare",
  "enum",
  "from",
  "implements",
  "infer",
  "interface",
  "is",
  "keyof",
  "let",
  "namespace",
  "of",
  "override",
  "private",
  "protected",
  "public",
  "readonly",
  "satisfies",
  "static",
  "type",
  "undefined",
  "yield",
]);

/** The labels Babel gives the chunks of a template literal. */
const TEMPLATE_LABELS = new Set(["...`", "...${"]);

/** How many separators the tokeniser will try before it gives up. */
const MAX_REPAIRS = 40;

/** The one parse error the repair below can fix. */
const ADJACENT_ELEMENTS = "UnwrappedAdjacentJSXElements";

/**
 * Split TypeScript or TSX source into highlighted runs. Concatenating every
 * run's text reproduces the input exactly.
 *
 * @param {string} source
 * @returns {CodeToken[]}
 */
function tokenise(source) {
  const parsed = repair(source);
  const context = contextKinds(parsed.ast);
  // Each separator stands for one whitespace character of the original.
  for (const at of parsed.separators) context.set(at, "plain");

  // Babel puts the comments in this array too. It types the array loosely, so
  // the shape read below is declared here.
  /** @type {{ start: number; end: number; type: TokenType }[]} */
  const stream = parsed.ast.tokens ?? [];

  /** @type {CodeToken[]} */
  const tokens = [];
  let pos = 0;
  for (const { start, end, type } of stream) {
    // Insurance: an empty or overlapping token would break the round trip.
    if (end <= start || start < pos) continue;
    if (start > pos) tokens.push(["plain", source.slice(pos, start)]);

    const text = source.slice(start, end);
    const label = typeof type === "string" ? type : type.label;
    const marked = context.get(start);
    if (marked !== undefined) tokens.push([marked, text]);
    else if (TEMPLATE_LABELS.has(label)) tokens.push(...templateRuns(text));
    else tokens.push([tokenKind(label, type, text), text]);
    pos = end;
  }
  if (pos < source.length) tokens.push(["plain", source.slice(pos)]);
  return merge(tokens);
}

/**
 * Report source that Babel cannot read. The quote shows the snippet, and the
 * cause holds the parse error.
 *
 * @param {string} source
 * @param {unknown} cause
 * @returns {Error}
 */
function invalidSource(source, cause) {
  const quote = source
    .split("\n")
    .filter((line) => line.trim() !== "")
    .slice(0, 3)
    .map((line) => `  ${line}`)
    .join("\n");
  return new Error(
    `[specimen-source]\n` +
      `The snippet is not valid TSX. A specimen expects TypeScript or TSX.\n` +
      quote,
    { cause },
  );
}

/**
 * Split a template chunk. The `${` and `}` that bound a hole are punctuation,
 * and the text around them is string.
 *
 * @param {string} text
 * @returns {CodeToken[]}
 */
function templateRuns(text) {
  /** @type {CodeToken[]} */
  const runs = [];
  let body = text;
  if (body.startsWith("}")) {
    runs.push(["punct", "}"]);
    body = body.slice(1);
  }
  const hole = body.endsWith("${");
  if (hole) body = body.slice(0, -2);
  if (body !== "") runs.push(["string", body]);
  if (hole) runs.push(["punct", "${"]);
  return runs;
}

/**
 * The kind the token stream alone gives one token.
 *
 * @param {string} label
 * @param {TokenType} type
 * @param {string} text
 * @returns {CodeTokenKind}
 */
function tokenKind(label, type, text) {
  if (label === "CommentLine" || label === "CommentBlock") return "comment";
  if (label === "string" || label === "template" || label === "regexp") {
    return "string";
  }
  if (label === "num" || label === "bigint") return "number";
  if (label === "jsxText") return "plain";
  if (label === "name") return SOFT_KEYWORDS.has(text) ? "keyword" : "plain";
  if (typeof type !== "string" && type.keyword != null) return "keyword";
  return "punct";
}

/**
 * Find the offsets the token stream cannot classify on its own.
 *
 * @param {File} ast
 * @returns {Map<number, CodeTokenKind>}
 */
function contextKinds(ast) {
  /** @type {Map<number, CodeTokenKind>} */
  const byStart = new Map();

  /**
   * @param {Node | null | undefined} node
   * @param {CodeTokenKind} kind
   */
  const mark = (node, kind) => {
    if (node?.start != null) byStart.set(node.start, kind);
  };

  /**
   * Give every part of a dotted or namespaced element name the same kind.
   *
   * @param {JSXName} name
   * @param {CodeTokenKind} kind
   */
  const markName = (name, kind) => {
    if (t.isJSXMemberExpression(name)) {
      markName(name.object, kind);
      mark(name.property, kind);
      return;
    }
    if (t.isJSXNamespacedName(name)) {
      mark(name.namespace, kind);
      mark(name.name, kind);
      return;
    }
    mark(name, kind);
  };

  /**
   * A quoted key keeps its string colour.
   *
   * @param {Node} key
   * @param {boolean} computed
   */
  const markKey = (key, computed) => {
    if (computed || t.isStringLiteral(key)) return;
    mark(key, "property");
  };

  traverse(ast, {
    "JSXOpeningElement|JSXClosingElement"({ node }) {
      markName(node.name, elementKind(node.name));
    },
    JSXAttribute({ node }) {
      markName(node.name, "attr");
    },
    "MemberExpression|OptionalMemberExpression"({ node }) {
      if (!node.computed) mark(node.property, "property");
    },
    ObjectProperty({ node }) {
      // A shorthand key names a binding, so it keeps the plain colour.
      if (!node.shorthand) markKey(node.key, node.computed);
    },
    "ObjectMethod|ClassProperty|ClassMethod|TSPropertySignature|TSMethodSignature"({
      node,
    }) {
      markKey(node.key, node.computed);
    },
    "ClassPrivateProperty|ClassPrivateMethod"({ node }) {
      mark(node.key, "property");
    },
  });

  return byStart;
}

/**
 * A name that starts with a lowercase letter is an intrinsic tag. Anything
 * else names a component.
 *
 * @param {JSXName} name
 * @returns {CodeTokenKind}
 */
function elementKind(name) {
  if (t.isJSXMemberExpression(name)) return "component";
  const text = t.isJSXNamespacedName(name) ? name.namespace.name : name.name;
  return /^[a-z]/.test(text) ? "tag" : "component";
}

/**
 * Parse TSX and keep the lexed tokens.
 *
 * @param {string} code
 * @returns {File}
 */
function parse(code) {
  const ast = parseSync(code, {
    filename: "snippet.tsx",
    configFile: false,
    babelrc: false,
    parserOpts: {
      plugins: ["jsx", "typescript"],
      tokens: true,
      errorRecovery: true,
      sourceType: "module",
      allowReturnOutsideFunction: true,
      allowSuperOutsideMethod: true,
      allowUndeclaredExports: true,
    },
  });
  // Babel returns null only when the config excludes the file, which the
  // options above rule out.
  if (ast === null) throw new Error("Babel returned no AST for the snippet.");
  return ast;
}

/**
 * Parse the source. Replace one whitespace character between two sibling
 * elements with a `;`, which keeps the length and every offset.
 *
 * @param {string} source
 * @returns {Parsed}
 */
function repair(source) {
  let buffer = source;
  /** @type {number[]} */
  const separators = [];
  /** @type {unknown} */
  let failure = null;
  for (let round = 0; round <= MAX_REPAIRS; round += 1) {
    try {
      return { ast: parse(buffer), separators };
    } catch (error) {
      failure = error;
      if (errorReason(error) !== ADJACENT_ELEMENTS) break;
      const at = errorIndex(error);
      if (at < 1) break;
      const gap = skipGapBack(buffer, at);
      if (gap < 1 || buffer[gap - 1] !== ">") break;
      if (!/\s/.test(buffer[gap] ?? "")) break;
      separators.push(gap);
      buffer = `${buffer.slice(0, gap)};${buffer.slice(gap + 1)}`;
    }
  }
  throw invalidSource(source, failure);
}

/**
 * Step back over the whitespace and comments that end before `at`.
 *
 * @param {string} source
 * @param {number} at
 * @returns {number}
 */
function skipGapBack(source, at) {
  for (;;) {
    while (at > 0 && /\s/.test(source[at - 1])) at -= 1;
    if (source.endsWith("*/", at)) {
      const open = source.lastIndexOf("/*", at - 2);
      if (open !== -1) {
        at = open;
        continue;
      }
    }
    const line = source.lastIndexOf("//", at - 1);
    if (line !== -1 && source.indexOf("\n", line) === at) {
      at = line;
      continue;
    }
    return at;
  }
}

/**
 * The offset Babel reports for a parse error, or -1.
 *
 * @param {unknown} error
 * @returns {number}
 */
function errorIndex(error) {
  if (typeof error !== "object" || error === null) return -1;
  if (!("loc" in error)) return -1;
  const loc = error.loc;
  if (typeof loc !== "object" || loc === null) return -1;
  if (!("index" in loc)) return -1;
  return typeof loc.index === "number" ? loc.index : -1;
}

/**
 * The name Babel gives a parse error, or an empty string.
 *
 * @param {unknown} error
 * @returns {string}
 */
function errorReason(error) {
  if (typeof error !== "object" || error === null) return "";
  if (!("reasonCode" in error)) return "";
  return typeof error.reasonCode === "string" ? error.reasonCode : "";
}

/**
 * Join neighbouring runs of the same kind.
 *
 * @param {CodeToken[]} tokens
 * @returns {CodeToken[]}
 */
function merge(tokens) {
  /** @type {CodeToken[]} */
  const merged = [];
  for (const [kind, text] of tokens) {
    const last = merged[merged.length - 1];
    if (last && last[0] === kind) last[1] += text;
    else merged.push([kind, text]);
  }
  return merged;
}

module.exports = { tokenise };
