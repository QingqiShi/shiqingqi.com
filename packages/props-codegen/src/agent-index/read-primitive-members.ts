import ts from "typescript";

/**
 * The keys of `export const <name> = stylex.create({ … })` in `source`, such
 * as `["text", "rows", "tight", …]` for `stack`.
 */
export function readPrimitiveMembers(source: string, name: string): string[] {
  const file = ts.createSourceFile(
    "primitive.stylex.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      if (declaration.name.text !== name) continue;
      const call = declaration.initializer;
      if (!call || !ts.isCallExpression(call)) return [];
      const argument = call.arguments.at(0);
      if (!argument || !ts.isObjectLiteralExpression(argument)) return [];
      return argument.properties.flatMap((property) =>
        property.name &&
        (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
          ? [property.name.text]
          : [],
      );
    }
  }
  return [];
}
