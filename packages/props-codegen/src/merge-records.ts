import ts from "typescript";
import type { MemberRecord } from "./collect-from-type-node.ts";
import {
  namedTypeReferenceOf,
  resolveTypeDeclaration,
  unwrapParens,
} from "./collect-from-type-node.ts";
import { collectShapes } from "./collect-shapes.ts";
import type { EnumMember, PropDoc } from "./types.ts";

/** Type references whose text alone says the prop holds renderable content. */
const NODE_TYPES = new Set([
  "ReactNode",
  "ReactElement",
  "ReactChild",
  "JSX.Element",
]);

export function normalizeSpace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** The literal members a type node names, following local aliases. */
function literalMembersOf(
  node: ts.TypeNode | undefined,
  checker: ts.TypeChecker,
  visited: Set<ts.Node>,
): EnumMember[] | undefined {
  node = unwrapParens(node);
  if (!node) return undefined;
  if (ts.isLiteralTypeNode(node)) {
    if (ts.isStringLiteral(node.literal)) return [node.literal.text];
    if (ts.isNumericLiteral(node.literal)) return [Number(node.literal.text)];
    return undefined;
  }
  if (ts.isTemplateLiteralTypeNode(node)) {
    return templateLiteralMembersOf(node, checker);
  }
  if (
    node.kind === ts.SyntaxKind.UndefinedKeyword ||
    node.kind === ts.SyntaxKind.NullKeyword
  ) {
    return [];
  }
  if (ts.isUnionTypeNode(node)) {
    const members: EnumMember[] = [];
    for (const constituent of node.types) {
      const resolved = literalMembersOf(constituent, checker, visited);
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
  return literalMembersOf(declaration.type, checker, visited);
}

/**
 * The strings a template literal type expands to — `` `${Side}-${Align}` ``
 * over two finite unions. A hole of `string` or `number` leaves the set
 * infinite, which the checker keeps as a template literal type, not a literal.
 */
function templateLiteralMembersOf(
  node: ts.TemplateLiteralTypeNode,
  checker: ts.TypeChecker,
): string[] | undefined {
  const type = checker.getTypeFromTypeNode(node);
  const constituents = type.isUnion() ? type.types : [type];
  const members: string[] = [];
  for (const constituent of constituents) {
    if (!constituent.isStringLiteral()) return undefined;
    members.push(constituent.value);
  }
  return members;
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
  members: EnumMember[] | undefined,
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

export function mergeRecords(
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
    const documented = group
      .map((record) => record.declaration)
      .filter((declaration) => declaration !== undefined);
    const typeText = printGroupType(group);
    if (typeText === "") continue;

    const members = enumMembersOf(typeNodes, checker);

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
    const kind = kindOf(typeNodes, typeText, members);
    const shapes = kind === "other" ? collectShapes(typeNodes, checker) : [];
    props.push({
      name,
      type: isEnum ? printMembers(members) : typeText,
      kind,
      ...(isEnum ? { members } : {}),
      ...(shapes.length > 0 ? { shapes } : {}),
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

function printMembers(members: readonly EnumMember[]): string {
  return members.map((member) => JSON.stringify(member)).join(" | ");
}

/** The members of a union type, at any depth; any other type is its own member. */
function unionMembersOf(node: ts.TypeNode | undefined): ts.TypeNode[] {
  const inner = unwrapParens(node);
  if (!inner) return [];
  return ts.isUnionTypeNode(inner)
    ? inner.types.flatMap(unionMembersOf)
    : [inner];
}

/**
 * The type of one name, joined across the branches that declare it. A
 * discriminated union declares the same name once per branch, and printing
 * only one branch would hide the other half of the API. Each member shows once,
 * with `null` last. `undefined`, which is how a branch says the name does not
 * belong to it, is left out.
 */
function printGroupType(group: readonly MemberRecord[]): string {
  const constituents: { text: string; isFunction: boolean }[] = [];
  const add = (text: string, isFunction: boolean) => {
    if (text === "" || text === "undefined") return;
    if (constituents.some((entry) => entry.text === text)) return;
    constituents.push({ text, isFunction });
  };
  for (const record of group) {
    if (record.impliedType !== undefined) {
      add(record.impliedType, false);
      continue;
    }
    for (const member of unionMembersOf(record.declaration?.type)) {
      add(normalizeSpace(member.getText()), isFunctionTypeNode(member));
    }
  }
  if (constituents.length < 2) return constituents[0]?.text ?? "";
  return constituents
    .toSorted((a, b) => Number(a.text === "null") - Number(b.text === "null"))
    .map((entry) => (entry.isFunction ? `(${entry.text})` : entry.text))
    .join(" | ");
}

/** The literal members of every branch, when every branch has them. */
function enumMembersOf(
  nodes: readonly (ts.TypeNode | undefined)[],
  checker: ts.TypeChecker,
): EnumMember[] | undefined {
  const members: EnumMember[] = [];
  for (const node of nodes) {
    const branch = literalMembersOf(node, checker, new Set());
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
