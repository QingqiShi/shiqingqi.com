// @ts-check

const { applyEdits, dedent, dropLines } = require("./apply-edits");
const { buildImportHeader } = require("./build-import-header");
const { readStringValue } = require("./collect-module-facts");
const {
  holeMarker,
  sourceAttribute,
  tokeniseAt,
} = require("./source-attribute");

/**
 * @typedef {typeof import("@babel/types")} BabelTypes
 * @typedef {import("@babel/types").JSXElement} JSXElement
 * @typedef {import("@babel/types").JSXAttribute} JSXAttribute
 * @typedef {import("@babel/types").Node} Node
 * @typedef {import("@babel/types").Expression} Expression
 * @typedef {import("@babel/types").ObjectExpression} ObjectExpression
 * @typedef {import("@babel/traverse").NodePath} AnyPath
 * @typedef {import("./apply-edits").Edit} Edit
 * @typedef {import("./collect-module-facts").LocalComponent} LocalComponent
 * @typedef {import("./collect-module-facts").ModuleFacts} ModuleFacts
 */

/** Documentation chrome that teaches the page, not the component. */
const CHROME = new Set([
  "ApiGrid",
  "DoDont",
  "Example",
  "GuideNote",
  "PropsTable",
  "ShowcaseHelper",
  "StateReadout",
  "UsageSnippet",
]);

// ── Building the source ──────────────────────────────────────────────────────

/**
 * Build the `source` prop for one specimen or example.
 *
 * @param {BabelTypes} t
 * @param {import("@babel/traverse").NodePath<JSXElement>} elementPath
 * @param {string} code
 * @param {ModuleFacts} facts
 * @returns {JSXAttribute | null}
 */
function buildSpecimenSource(t, elementPath, code, facts) {
  const element = elementPath.node;
  const from = element.openingElement.end;
  const to = element.closingElement?.start;
  if (from == null || to == null) return null;

  /** @type {Edit[]} */
  const edits = [];
  /** @type {Set<string>} */
  const names = new Set();
  /** @type {Expression[]} */
  const holes = [];
  for (const child of elementPath.get("children")) {
    if (t.isJSXElement(child.node) && isChrome(t, child.node)) {
      const edit = dropLines(code, child.node);
      if (edit) edits.push(edit);
      continue;
    }
    scan(t, child, code, facts, edits, names, holes);
  }

  const body = dedent(applyEdits(code, from, to, edits));
  if (body.trim() === "") return null;

  const { components, imported } = reachableComponents(
    t,
    code,
    facts,
    edits,
    names,
    holes,
  );

  const parts = [];
  const header = buildImportHeader(facts, imported);
  if (header) parts.push(header);
  parts.push(body);
  for (const component of components) {
    parts.push(applyEdits(code, component.start, component.end, edits));
  }
  return sourceAttribute(t, tokeniseAt(parts.join("\n\n"), elementPath), holes);
}

/**
 * Every local component the specimen reaches, including the ones it reaches
 * only through another component. A snippet that defined the outer component
 * but not the inner one would not compile for the reader who copied it.
 *
 * @param {BabelTypes} t
 * @param {string} code
 * @param {ModuleFacts} facts
 * @param {Edit[]} edits
 * @param {Set<string>} names The names the specimen itself references.
 * @param {Expression[]} holes
 * @returns {{ components: LocalComponent[], imported: Set<string> }}
 */
function reachableComponents(t, code, facts, edits, names, holes) {
  const imported = new Set(names);
  /** @type {Map<string, LocalComponent>} */
  const found = new Map();
  const queue = [...names];

  while (queue.length > 0) {
    const name = queue.shift();
    if (name === undefined) continue;
    const component = facts.components.get(name);
    // Reaching a component already found closes a cycle, so stop there.
    if (!component || found.has(name)) continue;
    found.set(name, component);

    /** @type {Set<string>} */
    const reached = new Set();
    scan(t, component.path, code, facts, edits, reached, holes);
    for (const next of reached) {
      imported.add(next);
      if (!found.has(next)) queue.push(next);
    }
  }

  return {
    components: [...found.values()].sort((a, b) => a.order - b.order),
    imported,
  };
}

/**
 * Collect the names a subtree references, the chrome to drop, and the
 * translations to unwrap.
 *
 * @param {BabelTypes} t
 * @param {AnyPath} path
 * @param {string} code
 * @param {ModuleFacts} facts
 * @param {Edit[]} edits
 * @param {Set<string>} names
 * @param {Expression[]} holes Where to keep the `t()` calls to show in the
 *   reader's locale.
 */
function scan(t, path, code, facts, edits, names, holes) {
  path.traverse({
    JSXElement(inner) {
      if (!isChrome(t, inner.node)) return;
      const edit = dropLines(code, inner.node);
      if (edit) edits.push(edit);
      inner.skip();
    },
    CallExpression(inner) {
      const edit = unwrapTranslation(t, inner, code, facts, holes);
      if (!edit) return;
      edits.push(edit);
      inner.skip();
    },
    ReferencedIdentifier(inner) {
      names.add(inner.node.name);
    },
  });
}

/**
 * Whether an element is documentation chrome.
 *
 * @param {BabelTypes} t
 * @param {JSXElement} element
 */
function isChrome(t, element) {
  const name = element.openingElement.name;
  return t.isJSXIdentifier(name) && CHROME.has(name.name);
}

/**
 * Rewrite `t({ en: "Primary", zh: "主要" })` as the text it stands for: a hole
 * that a copy of the call fills in the reader's locale. When the i18n
 * transform cannot compile that copy, the text is the English.
 *
 * @param {BabelTypes} t
 * @param {import("@babel/traverse").NodePath<import("@babel/types").CallExpression>} path
 * @param {string} code
 * @param {ModuleFacts} facts
 * @param {Expression[]} holes
 * @returns {Edit | null}
 */
function unwrapTranslation(t, path, code, facts, holes) {
  const call = path.node;
  if (!t.isIdentifier(call.callee, { name: facts.translateName })) return null;

  const [first] = call.arguments;
  if (!t.isObjectExpression(first)) return null;
  const english = first.properties.find(
    (property) =>
      t.isObjectProperty(property) &&
      t.isIdentifier(property.key, { name: "en" }),
  );
  if (!english || !t.isObjectProperty(english)) return null;

  const plain = readStringValue(t, english.value);
  const quoted = quoteValue(t, english.value, code);
  if (plain === null || quoted === null) return null;
  if (call.start == null || call.end == null) return null;

  const texts = readTranslations(t, first, facts);
  let prose = plain;
  let literal = quoted;
  if (texts) {
    prose = holeMarker(holes.length);
    literal = quoted[0] + prose + quoted[0];
    holes.push(
      t.callExpression(t.identifier(facts.translateName), [t.cloneNode(first)]),
    );
  }

  const container = path.parentPath;
  if (
    container.isJSXExpressionContainer() &&
    container.node.expression === call &&
    container.node.start != null &&
    container.node.end != null
  ) {
    const holder = container.parentPath;
    const isChild = holder.isJSXElement() || holder.isJSXFragment();
    const isProse = (texts ?? [plain]).every(isPlainProse);
    return {
      start: container.node.start,
      end: container.node.end,
      text: isChild && isProse ? prose : literal,
    };
  }

  return { start: call.start, end: call.end, text: literal };
}

/**
 * Every text of a `t()` argument, when the i18n transform can compile a copy
 * of the call.
 *
 * @param {BabelTypes} t
 * @param {ObjectExpression} argument
 * @param {ModuleFacts} facts
 * @returns {string[] | null}
 */
function readTranslations(t, argument, facts) {
  if (!facts.imports.has(facts.translateName)) return null;
  /** @type {string[]} */
  const texts = [];
  for (const property of argument.properties) {
    if (!t.isObjectProperty(property)) return null;
    const text = readStringValue(t, property.value);
    if (text === null) return null;
    texts.push(text);
  }
  return texts;
}

/**
 * Copy that can stand as JSX text without changing what follows it.
 *
 * @param {string} text
 */
function isPlainProse(text) {
  return !/[{}<>]/.test(text);
}

/**
 * The literal as the author wrote it, or a quoted equivalent.
 *
 * @param {BabelTypes} t
 * @param {Node} node
 * @param {string} code
 * @returns {string | null}
 */
function quoteValue(t, node, code) {
  if (t.isStringLiteral(node) && node.start != null && node.end != null) {
    return code.slice(node.start, node.end);
  }
  const value = readStringValue(t, node);
  return value === null ? null : JSON.stringify(value);
}

module.exports = { buildSpecimenSource };
