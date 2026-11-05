// @ts-check

/**
 * @typedef {import("@babel/types").Node} Node
 */

/**
 * A rewrite of one range of the original source.
 *
 * @typedef {object} Edit
 * @property {number} start
 * @property {number} end
 * @property {string} text
 */

/**
 * The lines a node occupies, so dropping it leaves no blank gap.
 *
 * @param {string} code
 * @param {Node} node
 * @returns {Edit | null}
 */
function dropLines(code, node) {
  if (node.start == null || node.end == null) return null;
  let start = node.start;
  let end = node.end;
  let lineStart = start;
  while (lineStart > 0 && code[lineStart - 1] !== "\n") lineStart -= 1;
  if (code.slice(lineStart, start).trim() === "") start = lineStart;
  while (end < code.length && /[ \t\r]/.test(code[end])) end += 1;
  if (code[end] === "\n") end += 1;
  return { start, end, text: "" };
}

/**
 * Print a range of the original source with the edits inside it applied.
 *
 * @param {string} code
 * @param {number} from
 * @param {number} to
 * @param {Edit[]} edits
 * @returns {string}
 */
function applyEdits(code, from, to, edits) {
  const inside = edits
    .filter((edit) => edit.start < to && edit.end > from)
    .map((edit) => ({
      start: Math.max(edit.start, from),
      end: Math.min(edit.end, to),
      text: edit.text,
    }))
    .sort((a, b) => a.start - b.start);

  let out = "";
  let cursor = from;
  for (const edit of inside) {
    if (edit.start < cursor) continue;
    out += code.slice(cursor, edit.start) + edit.text;
    cursor = edit.end;
  }
  return out + code.slice(cursor, to);
}

/**
 * Strip the common left edge and the blank lines at either end.
 *
 * @param {string} text
 * @returns {string}
 */
function dedent(text) {
  const lines = text.split("\n");
  while (lines.length > 0 && lines[0].trim() === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();

  let indent = Infinity;
  for (const line of lines) {
    if (line.trim() === "") continue;
    indent = Math.min(indent, /^[ \t]*/.exec(line)?.[0].length ?? 0);
  }
  if (!Number.isFinite(indent) || indent === 0) return lines.join("\n");
  return lines.map((line) => line.slice(indent)).join("\n");
}

module.exports = { applyEdits, dedent, dropLines };
