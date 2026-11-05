import ts from "typescript";

/** Type references that stand for an element's native attributes. */
const HTML_ATTRIBUTE_TYPES = new Set([
  "ComponentProps",
  "ComponentPropsWithoutRef",
  "ComponentPropsWithRef",
]);

/** Type references that pass their first argument through unchanged. */
const PASSTHROUGH_TYPES = new Set(["Omit", "Pick", "Partial", "Required"]);

export interface MemberRecord {
  name: string;
  optional: boolean;
  declaration?: ts.PropertySignature;
  /** Set instead of `declaration` for the `children` that `PropsWithChildren` adds. */
  impliedType?: string;
}

export interface CollectContext {
  checker: ts.TypeChecker;
  htmlTags: string[];
  visited: Set<ts.Node>;
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

export function namedTypeReferenceOf(
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

function isLocalDeclaration(node: ts.Node): boolean {
  return !node.getSourceFile().fileName.includes("/node_modules/");
}

export function resolveTypeDeclaration(
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
export function unwrapParens(
  node: ts.TypeNode | undefined,
): ts.TypeNode | undefined {
  return node && ts.isParenthesizedTypeNode(node)
    ? unwrapParens(node.type)
    : node;
}

/**
 * Walk a props type down to the members the component itself declares. A
 * reference to an element's native attributes records the tag and stops, so
 * inherited HTML attributes never reach the records.
 */
export function collectFromTypeNode(
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
