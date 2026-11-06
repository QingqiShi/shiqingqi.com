// @ts-check

const { tokeniseAt } = require("./source-attribute");

/**
 * @typedef {typeof import("@babel/types")} BabelTypes
 * @typedef {import("@babel/types").CallExpression} CallExpression
 * @typedef {import("@babel/types").Expression} Expression
 * @typedef {import("@babel/traverse").NodePath} AnyPath
 * @typedef {import("./collect-module-facts").ImportedName} ImportedName
 * @typedef {import("./collect-module-facts").ModuleFacts} ModuleFacts
 */

/** The call whose argument is a Lab sample, a Variant's node or a handler. */
const LAB_SOURCE = "labSource";

/**
 * The call that declares a stand-in for the setter a Lab snippet's `useState`
 * line declares. The snippet declares the name itself, so a source can use it.
 */
const LAB_SETTER = "labSetter";

/**
 * Give one `labSource(value)` call the source of its value as a second
 * argument: the tokens, the imports they use, and the StyleX styles of the
 * module they use, which the snippet prints before the element. A name that a
 * reader who copies the snippet cannot import or declare fails the build.
 *
 * @param {BabelTypes} t
 * @param {import("@babel/traverse").NodePath<CallExpression>} callPath
 * @param {string} code
 * @param {ModuleFacts} facts
 */
function buildLabSource(t, callPath, code, facts) {
  const call = callPath.node;
  if (!t.isIdentifier(call.callee, { name: LAB_SOURCE })) return;
  if (!facts.imports.has(LAB_SOURCE) || call.arguments.length !== 1) return;
  const [argument] = callPath.get("arguments");
  const { start, end } = argument.node;
  if (start == null || end == null) return;

  /** @type {Map<string, ImportedName>} */
  const imports = new Map();
  /** @type {Map<string, { start: number, end: number }>} */
  const definitions = new Map();
  collectNames(t, argument, callPath, facts, imports, definitions);

  const text = dedentTail(code.slice(start, end));
  const tokens = t.isObjectExpression(argument.node)
    ? unwrapParens(tokeniseAt(`(${text})`, callPath))
    : tokeniseAt(text, callPath);
  call.arguments.push(
    t.objectExpression([
      t.objectProperty(t.identifier("tokens"), tokensExpression(t, tokens)),
      t.objectProperty(
        t.identifier("imports"),
        t.arrayExpression(
          [...imports.values()].map((imported) =>
            importExpression(t, imported),
          ),
        ),
      ),
      t.objectProperty(
        t.identifier("definitions"),
        t.arrayExpression(
          [...definitions].map(([name, span]) =>
            t.objectExpression([
              t.objectProperty(t.identifier("name"), t.stringLiteral(name)),
              t.objectProperty(
                t.identifier("tokens"),
                tokensExpression(
                  t,
                  tokeniseAt(code.slice(span.start, span.end), callPath),
                ),
              ),
            ]),
          ),
        ),
      ),
    ]),
  );
}

/**
 * Sort every name a subtree uses into an import or a StyleX definition. A name
 * bound inside the source, such as an arrow's parameter, needs neither.
 *
 * @param {BabelTypes} t
 * @param {AnyPath} path
 * @param {AnyPath} callPath Where an error points.
 * @param {ModuleFacts} facts
 * @param {Map<string, ImportedName>} imports
 * @param {Map<string, { start: number, end: number }>} definitions
 */
function collectNames(t, path, callPath, facts, imports, definitions) {
  const programScope = callPath.scope.getProgramParent();
  /** @param {string} message */
  const fail = (message) => callPath.buildCodeFrameError(message);

  path.traverse({
    ReferencedIdentifier(inner) {
      const name = inner.node.name;
      const binding = inner.scope.getBinding(name);
      if (!binding || binding.scope !== programScope) return;

      const imported = facts.imports.get(name);
      if (imported) {
        if (imported.kind === "default" || imported.imported !== name) {
          throw fail(
            `A Lab source can use only a named or namespace import as it is named in its module, and "${name}" is not one.`,
          );
        }
        imports.set(name, imported);
        return;
      }

      const declarator = binding.path;
      const init = declarator.isVariableDeclarator()
        ? declarator.node.init
        : null;
      if (t.isCallExpression(init) && isLabSetter(t, init)) return;
      if (t.isCallExpression(init) && isStylexCreate(t, init)) {
        if (definitions.has(name)) return;
        const statement = declarator.parentPath;
        const { start, end } = statement?.node ?? {};
        if (start == null || end == null || !statement) return;
        definitions.set(name, { start, end });
        collectNames(t, statement, callPath, facts, imports, definitions);
        return;
      }

      throw fail(
        `A Lab source uses "${name}", which a reader who copies the snippet cannot import. Use an import, a stylex.create() style or a ${LAB_SETTER}().`,
      );
    },
  });
}

/**
 * @param {BabelTypes} t
 * @param {CallExpression} init
 */
function isLabSetter(t, init) {
  return t.isIdentifier(init.callee, { name: LAB_SETTER });
}

/**
 * @param {BabelTypes} t
 * @param {CallExpression} init
 */
function isStylexCreate(t, init) {
  return (
    t.isMemberExpression(init.callee) &&
    t.isIdentifier(init.callee.property, { name: "create" })
  );
}

/**
 * The tokens of a source without the parentheses around it. An object literal
 * at the start of a statement reads as a block, so it is tokenised in
 * parentheses.
 *
 * @param {import("./token-kinds").CodeToken[]} tokens
 */
function unwrapParens(tokens) {
  const inner = tokens.map(
    ([kind, text]) =>
      /** @type {import("./token-kinds").CodeToken} */ ([kind, text]),
  );
  const first = inner[0];
  const last = inner[inner.length - 1];
  first[1] = first[1].slice(1);
  last[1] = last[1].slice(0, -1);
  return inner.filter(([, text]) => text !== "");
}

/**
 * Removes the indent of the lines after the first. The first line starts
 * where the value starts, so it has no indent of its own.
 *
 * @param {string} text
 */
function dedentTail(text) {
  const [first, ...rest] = text.split("\n");
  const indents = rest
    .filter((line) => line.trim() !== "")
    .map((line) => /^ */.exec(line)?.[0].length ?? 0);
  const indent = indents.length === 0 ? 0 : Math.min(...indents);
  return [first, ...rest.map((line) => line.slice(indent))].join("\n");
}

/**
 * @param {BabelTypes} t
 * @param {import("./token-kinds").CodeToken[]} tokens
 */
function tokensExpression(t, tokens) {
  return t.arrayExpression(
    tokens.map(([kind, text]) =>
      t.arrayExpression([t.stringLiteral(kind), t.stringLiteral(text)]),
    ),
  );
}

/**
 * @param {BabelTypes} t
 * @param {ImportedName} imported
 */
function importExpression(t, imported) {
  return t.objectExpression([
    t.objectProperty(t.identifier("name"), t.stringLiteral(imported.local)),
    t.objectProperty(t.identifier("from"), t.stringLiteral(imported.source)),
    ...(imported.typeOnly
      ? [t.objectProperty(t.identifier("isType"), t.booleanLiteral(true))]
      : []),
    ...(imported.kind === "namespace"
      ? [t.objectProperty(t.identifier("isNamespace"), t.booleanLiteral(true))]
      : []),
  ]);
}

module.exports = { buildLabSource, LAB_SOURCE };
