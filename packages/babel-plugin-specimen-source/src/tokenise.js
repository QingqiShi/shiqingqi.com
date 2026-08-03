// @ts-check

/**
 * @typedef {import("./token-kinds").CodeTokenKind} CodeTokenKind
 * @typedef {import("./token-kinds").CodeToken} CodeToken
 */

/**
 * One nesting level of the scanner.
 *
 * @typedef {object} Frame
 * @property {"code" | "template" | "tag" | "children"} mode
 * @property {boolean} [closing] Tag frames only: the frame opened on `</`.
 * @property {boolean} [selfClosing] Tag frames only: a `/` came before the `>`.
 * @property {boolean} [opened] Template frames only: the first backtick is read.
 */

const KEYWORDS = new Set([
  "abstract",
  "as",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "declare",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "infer",
  "instanceof",
  "interface",
  "is",
  "keyof",
  "let",
  "namespace",
  "new",
  "null",
  "of",
  "override",
  "private",
  "protected",
  "public",
  "readonly",
  "return",
  "satisfies",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "try",
  "type",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "yield",
]);

/** Keywords that end a value, so a `<` after one is a comparison. */
const VALUE_KEYWORDS = new Set([
  "false",
  "null",
  "super",
  "this",
  "true",
  "undefined",
]);

/** Kinds that end a value, so a `<` after one is a comparison or a generic. */
const VALUE_KINDS = new Set([
  "plain",
  "number",
  "string",
  "property",
  "component",
  "tag",
  "attr",
]);

/** Punctuation a key can follow. */
const KEY_LEAD = new Set(["{", ",", ";"]);

const WHITESPACE = /\s+/y;
const IDENTIFIER = /[A-Za-z_$][\w$]*/y;
const JSX_NAME = /[A-Za-z_$][\w$.:-]*/y;
const ATTR_NAME = /[A-Za-z_$][\w$:-]*/y;
const NUMBER =
  /0[xX][\da-fA-F_]+n?|0[bB][01_]+n?|0[oO][0-7_]+n?|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d+)?n?/y;
/** An optional marker and a colon, which turns the name before it into a key. */
const KEY_TAIL = /[ \t]*\??[ \t]*:/y;

/**
 * Split TypeScript or TSX source into highlighted runs. Concatenating every
 * run's text reproduces the input exactly.
 *
 * @param {string} source
 * @returns {CodeToken[]}
 */
function tokenise(source) {
  /** @type {CodeToken[]} */
  const tokens = [];
  /** @type {Frame[]} */
  const stack = [{ mode: "code" }];
  let pos = 0;
  /** @type {CodeTokenKind | null} */
  let previousKind = null;
  let previousText = "";

  /**
   * Emit everything from the cursor up to `end` as one run.
   *
   * @param {CodeTokenKind} kind
   * @param {number} end
   */
  function emit(kind, end) {
    const stop = Math.min(Math.max(end, pos), source.length);
    if (stop === pos) return;
    const text = source.slice(pos, stop);
    tokens.push([kind, text]);
    if (kind !== "comment" && text.trim() !== "") {
      previousKind = kind;
      previousText = text;
    }
    pos = stop;
  }

  /**
   * Match a sticky pattern at the cursor.
   *
   * @param {RegExp} pattern
   * @returns {string | null}
   */
  function match(pattern) {
    pattern.lastIndex = pos;
    const found = pattern.exec(source);
    return found ? found[0] : null;
  }

  /** Whether the run before the cursor ends a value. */
  function afterValue() {
    if (previousKind === null) return false;
    if (previousKind === "keyword") return VALUE_KEYWORDS.has(previousText);
    if (previousKind === "punct")
      return previousText === ")" || previousText === "]";
    return VALUE_KINDS.has(previousKind);
  }

  /** Whether the `<` at the cursor opens a JSX tag rather than compares. */
  function opensTag() {
    const next = source[pos + 1];
    if (next === undefined) return false;
    if (!/[A-Za-z_$>/]/.test(next)) return false;
    return !afterValue();
  }

  /** Read the `<` or `</` at the cursor, then the element name. */
  function readTagOpen() {
    const closing = source[pos + 1] === "/";
    emit("punct", pos + (closing ? 2 : 1));
    /** @type {Frame} */
    const frame = { mode: "tag", closing, selfClosing: false };
    stack.push(frame);
    const name = match(JSX_NAME);
    if (name === null) return;
    const isComponent = name.includes(".") || /^[A-Z]/.test(name);
    emit(isComponent ? "component" : "tag", pos + name.length);
  }

  /** Read a `//` line comment, stopping before the newline. */
  function readLineComment() {
    const newline = source.indexOf("\n", pos);
    emit("comment", newline === -1 ? source.length : newline);
  }

  /** Read a block comment. */
  function readBlockComment() {
    const close = source.indexOf("*/", pos + 2);
    emit("comment", close === -1 ? source.length : close + 2);
  }

  /** Read a quoted string, stopping at the newline if it never closes. */
  function readQuoted() {
    const quote = source[pos];
    let index = pos + 1;
    while (index < source.length) {
      const char = source[index];
      if (char === "\\") {
        index += 2;
        continue;
      }
      if (char === "\n") break;
      index += 1;
      if (char === quote) break;
    }
    emit("string", index);
  }

  /** Read a run of ordinary TypeScript. */
  function readCode() {
    const char = source[pos];

    const space = match(WHITESPACE);
    if (space !== null) {
      emit("plain", pos + space.length);
      return;
    }

    if (char === "/" && source[pos + 1] === "/") {
      readLineComment();
      return;
    }
    if (char === "/" && source[pos + 1] === "*") {
      readBlockComment();
      return;
    }
    if (char === '"' || char === "'") {
      readQuoted();
      return;
    }
    if (char === "`") {
      /** @type {Frame} */
      const template = { mode: "template", opened: false };
      stack.push(template);
      readTemplate(template);
      return;
    }
    if (char === "{") {
      emit("punct", pos + 1);
      stack.push({ mode: "code" });
      return;
    }
    if (char === "}") {
      emit("punct", pos + 1);
      if (stack.length > 1) stack.pop();
      return;
    }
    if (char === "<") {
      if (opensTag()) readTagOpen();
      else emit("punct", pos + 1);
      return;
    }
    if (char === "." && source.startsWith("...", pos)) {
      emit("punct", pos + 3);
      return;
    }

    const isNumberStart =
      /\d/.test(char ?? "") ||
      (char === "." && /\d/.test(source[pos + 1] ?? "") && !afterValue());
    if (isNumberStart) {
      const number = match(NUMBER);
      if (number !== null) {
        emit("number", pos + number.length);
        return;
      }
    }

    const name = match(IDENTIFIER);
    if (name !== null) {
      const end = pos + name.length;
      if (previousKind === "punct" && previousText === ".") {
        emit("property", end);
        return;
      }
      if (KEY_LEAD.has(previousText) && isKeyAt(end)) {
        emit("property", end);
        return;
      }
      emit(KEYWORDS.has(name) ? "keyword" : "plain", end);
      return;
    }

    emit("punct", pos + 1);
  }

  /**
   * Whether a colon follows, which makes the name before `at` an object key.
   *
   * @param {number} at
   */
  function isKeyAt(at) {
    KEY_TAIL.lastIndex = at;
    return KEY_TAIL.test(source);
  }

  /**
   * Read a template literal chunk, up to its end or the next `${` hole.
   *
   * @param {Frame} frame
   */
  function readTemplate(frame) {
    let index = pos;
    if (!frame.opened) {
      frame.opened = true;
      index += 1;
    }
    while (index < source.length) {
      const char = source[index];
      if (char === "\\") {
        index += 2;
        continue;
      }
      if (char === "`") {
        emit("string", index + 1);
        stack.pop();
        return;
      }
      if (char === "$" && source[index + 1] === "{") {
        emit("string", index);
        emit("punct", index + 2);
        stack.push({ mode: "code" });
        return;
      }
      index += 1;
    }
    emit("string", source.length);
    stack.pop();
  }

  /**
   * Read a run inside a `<…>` tag.
   *
   * @param {Frame} frame
   */
  function readTag(frame) {
    const char = source[pos];

    const space = match(WHITESPACE);
    if (space !== null) {
      emit("plain", pos + space.length);
      return;
    }

    if (char === ">") {
      emit("punct", pos + 1);
      stack.pop();
      if (frame.closing) {
        if (stack.length > 1 && stack[stack.length - 1].mode === "children")
          stack.pop();
      } else if (!frame.selfClosing) {
        stack.push({ mode: "children" });
      }
      return;
    }
    if (char === "/") {
      if (source[pos + 1] === "/") {
        readLineComment();
        return;
      }
      if (source[pos + 1] === "*") {
        readBlockComment();
        return;
      }
      frame.selfClosing = true;
      emit("punct", pos + 1);
      return;
    }
    if (char === "{") {
      emit("punct", pos + 1);
      stack.push({ mode: "code" });
      return;
    }
    if (char === '"' || char === "'") {
      readQuoted();
      return;
    }

    const name = match(ATTR_NAME);
    if (name !== null) {
      emit("attr", pos + name.length);
      return;
    }

    emit("punct", pos + 1);
  }

  /** Read a run of element children. */
  function readChildren() {
    const char = source[pos];
    if (char === "<") {
      readTagOpen();
      return;
    }
    if (char === "{") {
      emit("punct", pos + 1);
      stack.push({ mode: "code" });
      return;
    }
    let index = pos + 1;
    while (index < source.length && !"<{".includes(source[index])) index += 1;
    emit("plain", index);
  }

  while (pos < source.length) {
    const before = pos;
    const frame = stack[stack.length - 1];
    if (frame.mode === "code") readCode();
    else if (frame.mode === "template") readTemplate(frame);
    else if (frame.mode === "tag") readTag(frame);
    else readChildren();
    // Every branch consumes at least one character, but a scanner that stalls
    // would hang the build, so force progress.
    if (pos === before) emit("punct", pos + 1);
  }

  return merge(tokens);
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
