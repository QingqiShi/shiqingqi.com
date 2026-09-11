import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import type { ComponentEntry } from "./collect-component-entries.ts";
import type { PropDoc, PropsDoc } from "./types.ts";

/** Type references that stand for an element's native attributes. */
const HTML_ATTRIBUTE_TYPES = new Set([
  "ComponentProps",
  "ComponentPropsWithoutRef",
  "ComponentPropsWithRef",
]);

/** Type references that pass their first argument through unchanged. */
const PASSTHROUGH_TYPES = new Set(["Omit", "Pick", "Partial", "Required"]);

/** Type references whose text alone says the prop holds renderable content. */
const NODE_TYPES = new Set([
  "ReactNode",
  "ReactElement",
  "ReactChild",
  "JSX.Element",
]);

interface MemberRecord {
  name: string;
  optional: boolean;
  declaration?: ts.PropertySignature;
  /** Set instead of `declaration` for the `children` that `PropsWithChildren` adds. */
  impliedType?: string;
}

interface CollectContext {
  checker: ts.TypeChecker;
  htmlTags: string[];
  visited: Set<ts.Node>;
}

/**
 * A TypeScript program rooted at the component files, so `extends`,
 * intersections and `Omit` resolve against the real declarations. Only the
 * roots are listed — the compiler pulls in everything they import.
 */
export function createPropsProgram(
  rootFiles: readonly string[],
  packageDir: string,
): ts.Program {
  const configPath = path.join(packageDir, "tsconfig.json");
  let options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.Preserve,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.Preserve,
    allowImportingTsExtensions: true,
    skipLibCheck: true,
    noEmit: true,
  };
  if (fs.existsSync(configPath)) {
    const config = ts.readConfigFile(configPath, (fileName) =>
      ts.sys.readFile(fileName),
    );
    const parsed = ts.parseJsonConfigFileContent(
      config.config,
      ts.sys,
      packageDir,
      undefined,
      configPath,
    );
    options = { ...parsed.options, noEmit: true };
  }
  return ts.createProgram([...rootFiles], options);
}

/**
 * A props type names a base either as a type reference (`Omit<…>` in a type
 * alias) or as a heritage clause entry (`extends Omit<…>`), which the AST
 * spells as an expression. Both read the same way.
 */
interface NamedTypeReference {
  name: string;
  target: ts.Node;
  typeArguments?: ts.NodeArray<ts.TypeNode>;
}

function namedTypeReferenceOf(
  node: ts.TypeNode,
): NamedTypeReference | undefined {
  if (ts.isTypeReferenceNode(node)) {
    return {
      name: ts.isIdentifier(node.typeName)
        ? node.typeName.text
        : node.typeName.right.text,
      target: node.typeName,
      typeArguments: node.typeArguments,
    };
  }
  if (ts.isExpressionWithTypeArguments(node)) {
    const expression = node.expression;
    const name = ts.isIdentifier(expression)
      ? expression.text
      : ts.isPropertyAccessExpression(expression)
        ? expression.name.text
        : undefined;
    if (name === undefined) return undefined;
    return { name, target: expression, typeArguments: node.typeArguments };
  }
  return undefined;
}

function memberNameOf(node: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text;
  return undefined;
}

function normalizeSpace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function isLocalDeclaration(node: ts.Node): boolean {
  return !node.getSourceFile().fileName.includes("/node_modules/");
}

function resolveTypeDeclaration(
  reference: NamedTypeReference,
  checker: ts.TypeChecker,
): ts.InterfaceDeclaration | ts.TypeAliasDeclaration | undefined {
  let symbol = checker.getSymbolAtLocation(reference.target);
  if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
    symbol = checker.getAliasedSymbol(symbol);
  }
  const declaration = symbol?.declarations?.find(
    (candidate) =>
      ts.isInterfaceDeclaration(candidate) ||
      ts.isTypeAliasDeclaration(candidate),
  );
  if (!declaration || !isLocalDeclaration(declaration)) return undefined;
  return declaration;
}

/** The element tag a `ComponentProps<"button">` style reference names. */
function htmlTagOf(reference: NamedTypeReference): string | undefined {
  if (!HTML_ATTRIBUTE_TYPES.has(reference.name)) return undefined;
  const argument = reference.typeArguments?.[0];
  if (
    argument &&
    ts.isLiteralTypeNode(argument) &&
    ts.isStringLiteral(argument.literal)
  ) {
    return argument.literal.text;
  }
  return undefined;
}

function recordsFromMembers(
  members: ts.NodeArray<ts.TypeElement>,
): MemberRecord[] {
  const records: MemberRecord[] = [];
  for (const member of members) {
    if (!ts.isPropertySignature(member)) continue;
    const name = memberNameOf(member.name);
    if (name === undefined) continue;
    records.push({
      name,
      optional: member.questionToken !== undefined,
      declaration: member,
    });
  }
  return records;
}

/**
 * A name that only some branches of a union carry can be satisfied by another
 * branch, so it is optional unless every branch demands it.
 */
function mergeUnionBranches(
  branches: readonly MemberRecord[][],
): MemberRecord[] {
  const byName = new Map<string, MemberRecord[]>();
  for (const branch of branches) {
    for (const record of branch) {
      const existing = byName.get(record.name);
      if (existing) existing.push(record);
      else byName.set(record.name, [record]);
    }
  }

  const merged: MemberRecord[] = [];
  for (const [name, records] of byName) {
    const demandedEverywhere = branches.every((branch) =>
      branch.some((record) => record.name === name && !record.optional),
    );
    for (const record of records) {
      merged.push({ ...record, optional: !demandedEverywhere });
    }
  }
  return merged;
}

/** The type inside any number of parentheses. */
function unwrapParens(node: ts.TypeNode | undefined): ts.TypeNode | undefined {
  return node && ts.isParenthesizedTypeNode(node)
    ? unwrapParens(node.type)
    : node;
}

/**
 * Walk a props type down to the members the component itself declares. A
 * reference to an element's native attributes records the tag and stops, so
 * inherited HTML attributes never reach the records.
 */
function collectFromTypeNode(
  node: ts.TypeNode | undefined,
  context: CollectContext,
): MemberRecord[] {
  node = unwrapParens(node);
  if (!node) return [];

  if (ts.isTypeLiteralNode(node)) {
    return recordsFromMembers(node.members);
  }
  if (ts.isIntersectionTypeNode(node)) {
    return node.types.flatMap((constituent) =>
      collectFromTypeNode(constituent, context),
    );
  }
  if (ts.isUnionTypeNode(node)) {
    return mergeUnionBranches(
      node.types.map((constituent) =>
        collectFromTypeNode(constituent, context),
      ),
    );
  }
  const reference = namedTypeReferenceOf(node);
  if (!reference) return [];

  const tag = htmlTagOf(reference);
  if (tag !== undefined) {
    if (!context.htmlTags.includes(tag)) context.htmlTags.push(tag);
    return [];
  }

  if (PASSTHROUGH_TYPES.has(reference.name)) {
    return collectFromTypeNode(reference.typeArguments?.[0], context);
  }
  if (reference.name === "PropsWithChildren") {
    return [
      { name: "children", optional: true, impliedType: "ReactNode" },
      ...collectFromTypeNode(reference.typeArguments?.[0], context),
    ];
  }

  const declaration = resolveTypeDeclaration(reference, context.checker);
  if (!declaration || context.visited.has(declaration)) return [];
  // Held only while this branch walks the declaration. A set that kept every
  // declaration it ever saw would starve the second branch of a union whose
  // branches share a base type, and every shared member would read optional.
  context.visited.add(declaration);
  try {
    if (ts.isTypeAliasDeclaration(declaration)) {
      return collectFromTypeNode(declaration.type, context);
    }
    const inherited = (declaration.heritageClauses ?? []).flatMap((clause) =>
      clause.types.flatMap((base) => collectFromTypeNode(base, context)),
    );
    return [...inherited, ...recordsFromMembers(declaration.members)];
  } finally {
    context.visited.delete(declaration);
  }
}

/** The string-literal members a type node names, following local aliases. */
function stringLiteralMembersOf(
  node: ts.TypeNode | undefined,
  checker: ts.TypeChecker,
  visited: Set<ts.Node>,
): string[] | undefined {
  node = unwrapParens(node);
  if (!node) return undefined;
  if (ts.isLiteralTypeNode(node)) {
    return ts.isStringLiteral(node.literal) ? [node.literal.text] : undefined;
  }
  if (
    node.kind === ts.SyntaxKind.UndefinedKeyword ||
    node.kind === ts.SyntaxKind.NullKeyword
  ) {
    return [];
  }
  if (ts.isUnionTypeNode(node)) {
    const members: string[] = [];
    for (const constituent of node.types) {
      const resolved = stringLiteralMembersOf(constituent, checker, visited);
      if (!resolved) return undefined;
      members.push(...resolved);
    }
    return members;
  }
  const reference = namedTypeReferenceOf(node);
  if (!reference) return undefined;
  const declaration = resolveTypeDeclaration(reference, checker);
  if (
    !declaration ||
    !ts.isTypeAliasDeclaration(declaration) ||
    visited.has(declaration)
  ) {
    return undefined;
  }
  visited.add(declaration);
  return stringLiteralMembersOf(declaration.type, checker, visited);
}

function isFunctionTypeNode(node: ts.TypeNode | undefined): boolean {
  node = unwrapParens(node);
  if (!node) return false;
  if (ts.isFunctionTypeNode(node)) return true;
  if (ts.isUnionTypeNode(node)) return node.types.some(isFunctionTypeNode);
  return false;
}

function kindOf(
  nodes: readonly (ts.TypeNode | undefined)[],
  typeText: string,
  members: string[] | undefined,
): PropDoc["kind"] {
  if (members && members.length > 0) return "enum";
  if (nodes.some(isFunctionTypeNode)) return "function";
  const bare = typeText.replace(/\s*\|\s*undefined$/, "");
  if (bare === "boolean") return "boolean";
  if (bare === "number") return "number";
  if (bare === "string") return "string";
  if (NODE_TYPES.has(bare.replace(/<.*>$/, ""))) return "node";
  return "other";
}

function jsDocSummaryOf(node: ts.Node): string {
  const comments = ts
    .getJSDocCommentsAndTags(node)
    .filter((entry): entry is ts.JSDoc => ts.isJSDoc(entry))
    .map((entry) => ts.getTextOfJSDocComment(entry.comment) ?? "")
    .filter((text) => text.length > 0);
  return normalizeDoc(comments.join("\n\n"));
}

function jsDocTagTextOf(node: ts.Node, tagName: string): string | undefined {
  for (const tag of ts.getJSDocTags(node)) {
    if (tag.tagName.text !== tagName) continue;
    const text = ts.getTextOfJSDocComment(tag.comment);
    if (text !== undefined) return normalizeDoc(text);
  }
  return undefined;
}

function normalizeDoc(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => normalizeSpace(paragraph))
    .filter((paragraph) => paragraph.length > 0)
    .join("\n\n");
}

/**
 * Drop a closing "Defaults to `x`." when `x` is the default the codegen
 * already reports, so the table does not print the same value twice.
 */
function stripDefaultSentence(
  text: string,
  defaultValue: string | undefined,
): string {
  if (defaultValue === undefined) return text;
  return text
    .replace(/\s*Defaults to `([^`]+)`\.(?=$|\n\n)/, (match, quoted: string) =>
      quoted === defaultValue ? "" : match,
    )
    .trim();
}

function readBindingDefaults(
  pattern: ts.ObjectBindingPattern,
  defaults: Map<string, string>,
): void {
  for (const element of pattern.elements) {
    if (!element.initializer) continue;
    const key = element.propertyName ?? element.name;
    if (!ts.isIdentifier(key) && !ts.isStringLiteral(key)) continue;
    defaults.set(key.text, normalizeSpace(element.initializer.getText()));
  }
}

/**
 * The destructuring defaults of a component's props. The parameter itself is
 * usually the pattern; a component that takes `props` whole is followed into
 * the statement that destructures it.
 */
export function collectDestructuringDefaults(
  fn: ts.FunctionDeclaration,
): Map<string, string> {
  const defaults = new Map<string, string>();
  const parameter = fn.parameters.at(0);
  if (!parameter) return defaults;

  if (ts.isObjectBindingPattern(parameter.name)) {
    readBindingDefaults(parameter.name, defaults);
    return defaults;
  }
  if (!ts.isIdentifier(parameter.name) || !fn.body) return defaults;

  const parameterName = parameter.name.text;
  for (const statement of fn.body.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isObjectBindingPattern(declaration.name)) continue;
      const initializer = declaration.initializer;
      if (
        initializer &&
        ts.isIdentifier(initializer) &&
        initializer.text === parameterName
      ) {
        readBindingDefaults(declaration.name, defaults);
      }
    }
  }
  return defaults;
}

function findComponentFunction(
  sourceFile: ts.SourceFile,
  componentName: string,
): ts.FunctionDeclaration | undefined {
  for (const statement of sourceFile.statements) {
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === componentName
    ) {
      return statement;
    }
  }
  return undefined;
}

function mergeRecords(
  records: readonly MemberRecord[],
  checker: ts.TypeChecker,
  defaults: ReadonlyMap<string, string>,
): PropDoc[] {
  const grouped = new Map<string, MemberRecord[]>();
  for (const record of records) {
    const existing = grouped.get(record.name);
    if (existing) existing.push(record);
    else grouped.set(record.name, [record]);
  }

  const props: PropDoc[] = [];
  for (const [name, group] of grouped) {
    const typeNodes = group.map((record) => record.declaration?.type);
    const typeText = printGroupType(group);
    if (typeText === "") continue;

    const members = enumMembersOf(typeNodes, checker);
    const documented = group
      .map((record) => record.declaration)
      .filter((declaration) => declaration !== undefined);

    const tagDefault = documented
      .map(
        (declaration) =>
          jsDocTagTextOf(declaration, "default") ??
          jsDocTagTextOf(declaration, "defaultValue"),
      )
      .find((value) => value !== undefined);
    const defaultValue = tagDefault ?? defaults.get(name);

    const english = documented
      .map((declaration) => jsDocSummaryOf(declaration))
      .find((summary) => summary.length > 0);
    const chinese = documented
      .map((declaration) => jsDocTagTextOf(declaration, "zh"))
      .find((text) => text !== undefined);
    const deprecated = documented
      .map((declaration) => jsDocTagTextOf(declaration, "deprecated"))
      .find((text) => text !== undefined);

    const isEnum = members !== undefined && members.length > 0;
    props.push({
      name,
      type: isEnum ? printMembers(members) : typeText,
      kind: kindOf(typeNodes, typeText, members),
      ...(isEnum ? { members } : {}),
      required: group.every((record) => !record.optional),
      ...(defaultValue === undefined ? {} : { defaultValue }),
      description: {
        en: stripDefaultSentence(english ?? "", defaultValue),
        zh: chinese ?? "",
      },
      ...(deprecated === undefined ? {} : { deprecated }),
    });
  }

  return sortProps(props);
}

function printMembers(members: readonly string[]): string {
  return members.map((member) => JSON.stringify(member)).join(" | ");
}

/**
 * The type of one name, joined across the branches that declare it. A
 * discriminated union declares the same name once per branch, and printing
 * only one branch would hide the other half of the API. `undefined`, which is
 * how a branch says the name does not belong to it, is left out.
 */
function printGroupType(group: readonly MemberRecord[]): string {
  const constituents: { text: string; isFunction: boolean }[] = [];
  for (const record of group) {
    const text =
      record.impliedType ??
      normalizeSpace(record.declaration?.type?.getText() ?? "");
    if (text === "" || text === "undefined") continue;
    if (constituents.some((entry) => entry.text === text)) continue;
    constituents.push({
      text,
      isFunction: isFunctionTypeNode(record.declaration?.type),
    });
  }
  if (constituents.length < 2) return constituents[0]?.text ?? "";
  return constituents
    .map((entry) => (entry.isFunction ? `(${entry.text})` : entry.text))
    .join(" | ");
}

/** The string-literal members of every branch, when every branch has them. */
function enumMembersOf(
  nodes: readonly (ts.TypeNode | undefined)[],
  checker: ts.TypeChecker,
): string[] | undefined {
  const members: string[] = [];
  for (const node of nodes) {
    const branch = stringLiteralMembersOf(node, checker, new Set());
    if (!branch) return undefined;
    for (const member of branch) {
      if (!members.includes(member)) members.push(member);
    }
  }
  return members;
}

/** `children` leads, `css` closes, everything else keeps declaration order. */
function sortProps(props: readonly PropDoc[]): PropDoc[] {
  const rank = (prop: PropDoc) =>
    prop.name === "children" ? 0 : prop.name === "css" ? 2 : 1;
  return props
    .map((prop, index) => ({ prop, index }))
    .sort((a, b) => rank(a.prop) - rank(b.prop) || a.index - b.index)
    .map((entry) => entry.prop);
}

/** Everything one component declares, ready to write as a JSON document. */
export function collectPropsDoc(
  program: ts.Program,
  entry: ComponentEntry,
  repoRoot: string,
): PropsDoc {
  const sourceFile = program.getSourceFile(entry.file);
  if (!sourceFile) {
    throw new Error(`No source file for ${entry.file}`);
  }
  const fn = findComponentFunction(sourceFile, entry.component);
  if (!fn) {
    throw new Error(`${entry.file} exports no function ${entry.component}`);
  }

  const context: CollectContext = {
    checker: program.getTypeChecker(),
    htmlTags: [],
    visited: new Set(),
  };
  const records = collectFromTypeNode(fn.parameters.at(0)?.type, context);

  const tag = context.htmlTags.at(0);
  return {
    component: entry.component,
    source: path.relative(repoRoot, entry.file),
    ...(tag === undefined ? {} : { extendsHtml: tag }),
    props: mergeRecords(
      records,
      context.checker,
      collectDestructuringDefaults(fn),
    ),
  };
}

/** One document per component, in export-subpath order. */
export function collectPropsDocs(
  program: ts.Program,
  entries: readonly ComponentEntry[],
  repoRoot: string,
): Map<string, PropsDoc> {
  const docs = new Map<string, PropsDoc>();
  for (const entry of entries) {
    docs.set(entry.name, collectPropsDoc(program, entry, repoRoot));
  }
  return docs;
}
