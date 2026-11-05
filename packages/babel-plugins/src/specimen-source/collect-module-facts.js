// @ts-check

/**
 * @typedef {typeof import("@babel/types")} BabelTypes
 * @typedef {import("@babel/types").Node} Node
 * @typedef {import("@babel/types").Program} Program
 * @typedef {import("@babel/types").Statement} Statement
 * @typedef {import("@babel/traverse").NodePath<Program>} ProgramPath
 * @typedef {import("@babel/traverse").NodePath<Statement>} StatementPath
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

module.exports = { collectModuleFacts, readStringValue };
