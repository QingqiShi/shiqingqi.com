// @ts-check

const { tokenise } = require("./tokenise");

/**
 * @typedef {import("@babel/core").PluginPass} PluginPass
 * @typedef {typeof import("@babel/types")} BabelTypes
 * @typedef {import("@babel/types").CallExpression} CallExpression
 * @typedef {import("@babel/types").JSXElement} JSXElement
 * @typedef {import("@babel/types").JSXOpeningElement} JSXOpeningElement
 * @typedef {import("@babel/types").JSXAttribute} JSXAttribute
 * @typedef {import("@babel/types").Node} Node
 * @typedef {import("@babel/types").Program} Program
 * @typedef {import("@babel/types").Statement} Statement
 * @typedef {import("@babel/traverse").NodePath<Program>} ProgramPath
 * @typedef {import("@babel/traverse").NodePath<Statement>} StatementPath
 * @typedef {import("@babel/traverse").NodePath} AnyPath
 * @typedef {import("./token-kinds").CodeToken} CodeToken
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
 * One name the module imports.
 *
 * @typedef {object} ImportedName
 * @property {string} source
 * @property {"default" | "namespace" | "named"} kind
 * @property {string} imported
 * @property {string} local
 * @property {boolean} typeOnly
 * @property {number} order
 */

/**
 * One component the module declares itself.
 *
 * @typedef {object} LocalComponent
 * @property {number} start
 * @property {number} end
 * @property {number} order
 * @property {StatementPath} path
 */

/**
 * What the module offers a specimen: the names it imports, the components it
 * declares, the string constants it holds, and its local name for `t`.
 *
 * @typedef {object} ModuleFacts
 * @property {Map<string, ImportedName>} imports
 * @property {Map<string, LocalComponent>} components
 * @property {Map<string, string>} constants
 * @property {string} translateName
 */

/** Documentation chrome that teaches the page, not the component. */
const CHROME = new Set([
  "ApiGrid",
  "DoDont",
  "GuideNote",
  "PropsTable",
  "ShowcaseHelper",
  "StateReadout",
  "UsageSnippet",
]);

/** Where prettier wraps, so a generated import header wraps with it. */
const PRINT_WIDTH = 80;

/**
 * A Babel plugin that reveals the source of a design-system specimen.
 *
 * It gives every `<Specimen>` a `source` prop holding the token array for its
 * children, and every `<UsageSnippet code={…}>` the token array for its code.
 * The text comes from the original file rather than from the AST, so it must
 * run first: a later plugin that rewrites `t()` would otherwise decide what the
 * reader sees.
 *
 * @param {{ types: BabelTypes }} babel
 * @returns {import("@babel/core").PluginObject<PluginPass>}
 */
module.exports = function specimenSourcePlugin({ types: t }) {
  return {
    name: "specimen-source",
    visitor: {
      Program: {
        enter(path, state) {
          const code = state.file.code;
          if (!code) return;
          // Most of the app holds neither element. Both are matched by their
          // literal JSX name below, so a file whose text lacks both cannot
          // produce a match — skip the walk rather than collect facts nothing
          // will read.
          if (!code.includes("<Specimen") && !code.includes("<UsageSnippet")) {
            return;
          }
          const facts = collectModuleFacts(t, path, code);

          path.traverse({
            JSXElement(elementPath) {
              const opening = elementPath.node.openingElement;
              if (!t.isJSXIdentifier(opening.name)) return;
              if (findAttribute(t, opening, "source")) return;

              const element = opening.name.name;

              if (element === "Specimen") {
                const tokens = buildSpecimenSource(t, elementPath, code, facts);
                if (tokens) opening.attributes.push(sourceAttribute(t, tokens));
                return;
              }

              if (element === "UsageSnippet") {
                const snippet = resolveSnippet(t, opening, facts);
                if (snippet === null) return;
                opening.attributes.push(
                  sourceAttribute(t, tokeniseAt(snippet, elementPath)),
                );
              }
            },
          });
        },
      },
    },
  };
};

// ── Module facts ─────────────────────────────────────────────────────────────

/**
 * Read what the module imports and declares.
 *
 * @param {BabelTypes} t
 * @param {ProgramPath} path
 * @param {string} code
 * @returns {ModuleFacts}
 */
function collectModuleFacts(t, path, code) {
  /** @type {ModuleFacts} */
  const facts = {
    imports: new Map(),
    components: new Map(),
    constants: new Map(),
    translateName: "t",
  };
  let order = 0;

  path.get("body").forEach((statementPath, index) => {
    const statement = statementPath.node;

    if (t.isImportDeclaration(statement)) {
      const source = statement.source.value;
      const declarationIsType = statement.importKind === "type";
      for (const specifier of statement.specifiers) {
        const local = specifier.local.name;
        if (t.isImportNamespaceSpecifier(specifier)) {
          facts.imports.set(local, {
            source,
            kind: "namespace",
            imported: local,
            local,
            typeOnly: declarationIsType,
            order,
          });
        } else if (t.isImportDefaultSpecifier(specifier)) {
          facts.imports.set(local, {
            source,
            kind: "default",
            imported: local,
            local,
            typeOnly: declarationIsType,
            order,
          });
        } else {
          const imported = t.isIdentifier(specifier.imported)
            ? specifier.imported.name
            : specifier.imported.value;
          if (imported === "t") facts.translateName = local;
          facts.imports.set(local, {
            source,
            kind: "named",
            imported,
            local,
            typeOnly: declarationIsType || specifier.importKind === "type",
            order,
          });
        }
        order += 1;
      }
      return;
    }

    const declaration =
      t.isExportNamedDeclaration(statement) && statement.declaration
        ? statement.declaration
        : statement;
    const span = spanWithComments(code, statement);
    if (!span) return;

    if (t.isFunctionDeclaration(declaration) && declaration.id) {
      if (isComponentName(declaration.id.name)) {
        facts.components.set(declaration.id.name, {
          ...span,
          order: index,
          path: statementPath,
        });
      }
      return;
    }

    if (!t.isVariableDeclaration(declaration)) return;
    for (const declarator of declaration.declarations) {
      if (!t.isIdentifier(declarator.id) || !declarator.init) continue;
      const text = readStringValue(t, declarator.init);
      if (text !== null) {
        facts.constants.set(declarator.id.name, text);
        continue;
      }
      const isFunction =
        t.isArrowFunctionExpression(declarator.init) ||
        t.isFunctionExpression(declarator.init);
      if (isFunction && isComponentName(declarator.id.name)) {
        facts.components.set(declarator.id.name, {
          ...span,
          order: index,
          path: statementPath,
        });
      }
    }
  });

  return facts;
}

/**
 * A name React renders as a component rather than as an element.
 *
 * @param {string} name
 */
function isComponentName(name) {
  return /^[A-Z]/.test(name);
}

/**
 * The value of a plain string literal or a template literal with no holes.
 *
 * @param {BabelTypes} t
 * @param {Node} node
 * @returns {string | null}
 */
function readStringValue(t, node) {
  if (t.isStringLiteral(node)) return node.value;
  if (!t.isTemplateLiteral(node) || node.expressions.length > 0) return null;
  return node.quasis[0].value.cooked ?? node.quasis[0].value.raw;
}

// ── Building the source ──────────────────────────────────────────────────────

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
 * Build the token array for one specimen.
 *
 * @param {BabelTypes} t
 * @param {import("@babel/traverse").NodePath<JSXElement>} elementPath
 * @param {string} code
 * @param {ModuleFacts} facts
 * @returns {CodeToken[] | null}
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
  for (const child of elementPath.get("children")) {
    if (t.isJSXElement(child.node) && isChrome(t, child.node)) {
      const edit = dropLines(code, child.node);
      if (edit) edits.push(edit);
      continue;
    }
    scan(t, child, code, facts, edits, names);
  }

  const body = dedent(applyEdits(code, from, to, edits));
  if (body.trim() === "") return null;

  const { components, imported } = reachableComponents(
    t,
    code,
    facts,
    edits,
    names,
  );

  const parts = [];
  const header = buildImportHeader(facts, imported);
  if (header) parts.push(header);
  parts.push(body);
  for (const component of components) {
    parts.push(applyEdits(code, component.start, component.end, edits));
  }
  return tokeniseAt(parts.join("\n\n"), elementPath);
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
 * @returns {{ components: LocalComponent[], imported: Set<string> }}
 */
function reachableComponents(t, code, facts, edits, names) {
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
    scan(t, component.path, code, facts, edits, reached);
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
 */
function scan(t, path, code, facts, edits, names) {
  path.traverse({
    JSXElement(inner) {
      if (!isChrome(t, inner.node)) return;
      const edit = dropLines(code, inner.node);
      if (edit) edits.push(edit);
      inner.skip();
    },
    CallExpression(inner) {
      const edit = unwrapTranslation(t, inner, code, facts);
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
 * Rewrite `t({ en: "Primary", zh: "主要" })` as the English it stands for.
 *
 * @param {BabelTypes} t
 * @param {import("@babel/traverse").NodePath<import("@babel/types").CallExpression>} path
 * @param {string} code
 * @param {ModuleFacts} facts
 * @returns {Edit | null}
 */
function unwrapTranslation(t, path, code, facts) {
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

  const container = path.parentPath;
  if (
    container.isJSXExpressionContainer() &&
    container.node.expression === call &&
    container.node.start != null &&
    container.node.end != null
  ) {
    const holder = container.parentPath;
    const isChild = holder.isJSXElement() || holder.isJSXFragment();
    return {
      start: container.node.start,
      end: container.node.end,
      text: isChild && isPlainProse(plain) ? plain : quoted,
    };
  }

  return { start: call.start, end: call.end, text: quoted };
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

/**
 * The start and end of a statement, taking in the comment above it.
 *
 * @param {string} code
 * @param {Statement} node
 * @returns {{ start: number, end: number } | null}
 */
function spanWithComments(code, node) {
  if (node.start == null || node.end == null) return null;
  let start = node.start;
  const comments = node.leadingComments ?? [];
  for (let index = comments.length - 1; index >= 0; index -= 1) {
    const comment = comments[index];
    if (comment.start == null || comment.end == null) break;
    if (code.slice(comment.end, start).trim() !== "") break;
    start = comment.start;
  }
  return { start, end: node.end };
}

// ── The import header ────────────────────────────────────────────────────────

/**
 * Emit an import declaration for every imported name the snippet uses.
 *
 * @param {ModuleFacts} facts
 * @param {Set<string>} names
 * @returns {string}
 */
function buildImportHeader(facts, names) {
  /** @type {Map<string, ImportedName[]>} */
  const bySource = new Map();
  for (const name of names) {
    const imported = facts.imports.get(name);
    if (!imported) continue;
    const group = bySource.get(imported.source);
    if (group) group.push(imported);
    else bySource.set(imported.source, [imported]);
  }

  /** @type {string[]} */
  const lines = [];
  for (const source of [...bySource.keys()].sort(compareSources)) {
    const specifiers = (bySource.get(source) ?? []).sort(
      (a, b) => a.order - b.order,
    );
    lines.push(...formatImport(source, specifiers));
  }
  return lines.join("\n");
}

/**
 * Print one import declaration, wrapping the way prettier would.
 *
 * @param {string} source
 * @param {ImportedName[]} specifiers
 * @returns {string[]}
 */
function formatImport(source, specifiers) {
  /** @type {string[]} */
  const lines = [];
  const namespace = specifiers.find((one) => one.kind === "namespace");
  if (namespace) {
    lines.push(`import * as ${namespace.local} from "${source}";`);
  }

  const defaults = specifiers.filter((one) => one.kind === "default");
  const named = specifiers.filter((one) => one.kind === "named");
  if (defaults.length === 0 && named.length === 0) return lines;

  const allType = [...defaults, ...named].every((one) => one.typeOnly);
  const keyword = allType ? "import type" : "import";
  const head = defaults.map((one) => one.local).join(", ");
  const parts = named.map((one) => {
    const prefix = !allType && one.typeOnly ? "type " : "";
    const body =
      one.imported === one.local
        ? one.local
        : `${one.imported} as ${one.local}`;
    return prefix + body;
  });

  const clause = [head, parts.length > 0 ? `{ ${parts.join(", ")} }` : ""]
    .filter(Boolean)
    .join(", ");
  // Prettier breaks a specifier list over lines only when there are two or
  // more to break.
  const single = `${keyword} ${clause} from "${source}";`;
  if (single.length <= PRINT_WIDTH || parts.length < 2) {
    lines.push(single);
    return lines;
  }

  lines.push(
    `${keyword} ${head ? `${head}, {` : "{"}`,
    ...parts.map((part) => `  ${part},`),
    `} from "${source}";`,
  );
  return lines;
}

/**
 * Order two import sources the way the repository's lint rule orders them.
 *
 * @param {string} a
 * @param {string} b
 */
function compareSources(a, b) {
  const byGroup = sourceGroup(a) - sourceGroup(b);
  if (byGroup !== 0) return byGroup;
  const lowerA = a.toLowerCase();
  const lowerB = b.toLowerCase();
  if (lowerA !== lowerB) return lowerA < lowerB ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * @param {string} source
 */
function sourceGroup(source) {
  if (source.startsWith("node:")) return 0;
  if (source.startsWith("#")) return 2;
  if (source.startsWith("../")) return 3;
  if (source.startsWith("./")) return 4;
  return 1;
}

// ── Injection ────────────────────────────────────────────────────────────────

/**
 * @param {BabelTypes} t
 * @param {JSXOpeningElement} opening
 * @param {string} name
 * @returns {JSXAttribute | null}
 */
function findAttribute(t, opening, name) {
  for (const attribute of opening.attributes) {
    if (
      t.isJSXAttribute(attribute) &&
      t.isJSXIdentifier(attribute.name, { name })
    ) {
      return attribute;
    }
  }
  return null;
}

/**
 * The code a `<UsageSnippet>` shows, resolving a module-level constant.
 *
 * @param {BabelTypes} t
 * @param {JSXOpeningElement} opening
 * @param {ModuleFacts} facts
 * @returns {string | null}
 */
function resolveSnippet(t, opening, facts) {
  const attribute = findAttribute(t, opening, "code");
  if (!attribute?.value) return null;
  if (t.isStringLiteral(attribute.value)) return attribute.value.value;
  if (!t.isJSXExpressionContainer(attribute.value)) return null;

  const expression = attribute.value.expression;
  const text = readStringValue(t, expression);
  if (text !== null) return text;
  if (t.isIdentifier(expression)) {
    return facts.constants.get(expression.name) ?? null;
  }
  return null;
}

/**
 * @param {BabelTypes} t
 * @param {CodeToken[]} tokens
 * @returns {JSXAttribute}
 */
function sourceAttribute(t, tokens) {
  return t.jsxAttribute(
    t.jsxIdentifier("source"),
    t.jsxExpressionContainer(
      t.arrayExpression(
        tokens.map(([kind, text]) =>
          t.arrayExpression([t.stringLiteral(kind), t.stringLiteral(text)]),
        ),
      ),
    ),
  );
}
