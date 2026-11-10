import ts from "typescript";
import {
  isLocalDeclaration,
  namedTypeReferenceOf,
  resolveTypeDeclaration,
  unwrapParens,
} from "./collect-from-type-node.ts";

const ARRAY_TYPES = new Set(["Array", "ReadonlyArray"]);

/** The named types a prop holds: itself, each union member, or each item of an array. */
function heldReferences(node: ts.TypeNode | undefined): ts.TypeNode[] {
  node = unwrapParens(node);
  if (!node) return [];
  if (ts.isUnionTypeNode(node)) return node.types.flatMap(heldReferences);
  if (ts.isTypeOperatorNode(node)) return heldReferences(node.type);
  if (ts.isArrayTypeNode(node)) return heldReferences(node.elementType);
  const reference = namedTypeReferenceOf(node);
  if (reference && ARRAY_TYPES.has(reference.name)) {
    return heldReferences(reference.typeArguments?.[0]);
  }
  return reference ? [node] : [];
}

function fieldTypeText(
  property: ts.Symbol,
  declaration: ts.Declaration,
  checker: ts.TypeChecker,
): string {
  if (ts.isPropertySignature(declaration) && declaration.type) {
    return declaration.type.getText().replace(/\s+/g, " ").trim();
  }
  return checker.typeToString(
    checker.getTypeOfSymbolAtLocation(property, declaration),
  );
}

/**
 * `BreadcrumbItem { label: string; href?: string }`: the fields of an object
 * type that `@tuja/ui` declares, so a reader can write a value of it without
 * opening the source. A function type, a primitive alias or a type from a
 * dependency has no shape worth printing.
 */
function shapeOf(
  node: ts.TypeNode,
  checker: ts.TypeChecker,
): string | undefined {
  const reference = namedTypeReferenceOf(node);
  if (!reference) return undefined;
  const declaration = resolveTypeDeclaration(reference, checker);
  if (!declaration) return undefined;

  const type = ts.isInterfaceDeclaration(declaration)
    ? checker.getTypeAtLocation(declaration.name)
    : checker.getTypeFromTypeNode(declaration.type);
  if (type.isUnion() || type.getCallSignatures().length > 0) return undefined;
  if (type.getConstructSignatures().length > 0) return undefined;

  const fields: string[] = [];
  for (const property of checker.getPropertiesOfType(type)) {
    const propertyDeclaration = property.declarations?.at(0);
    if (!propertyDeclaration || !isLocalDeclaration(propertyDeclaration)) {
      continue;
    }
    const optional = (property.flags & ts.SymbolFlags.Optional) !== 0;
    fields.push(
      `${property.name}${optional ? "?" : ""}: ${fieldTypeText(property, propertyDeclaration, checker)}`,
    );
  }
  if (fields.length === 0) return undefined;
  return `${reference.name} { ${fields.join("; ")} }`;
}

/** The shape of each named object type the prop holds, once each. */
export function collectShapes(
  nodes: readonly (ts.TypeNode | undefined)[],
  checker: ts.TypeChecker,
): string[] {
  const shapes: string[] = [];
  for (const node of nodes.flatMap(heldReferences)) {
    const shape = shapeOf(node, checker);
    if (shape !== undefined && !shapes.includes(shape)) shapes.push(shape);
  }
  return shapes;
}
