import ts from "typescript";

function dedent(text: string): string {
  const lines = text.split("\n");
  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => line.length - line.trimStart().length);
  const cut = Math.min(...indents);
  return lines.map((line) => line.slice(cut)).join("\n");
}

function objectLiteralOf(
  expression: ts.Expression | undefined,
): ts.ObjectLiteralExpression | undefined {
  if (!expression) return undefined;
  if (ts.isSatisfiesExpression(expression) || ts.isAsExpression(expression)) {
    return objectLiteralOf(expression.expression);
  }
  return ts.isObjectLiteralExpression(expression) ? expression : undefined;
}

/**
 * Each method of the `examples` object in `source`, keyed by its name, as a
 * component function of its own: `TabView() { … }` becomes
 * `function TabViewExample() { … }`.
 */
export function extractExamples(source: string): Map<string, string> {
  const file = ts.createSourceFile(
    "examples.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const examples = new Map<string, string>();
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      if (declaration.name.text !== "examples") continue;
      const object = objectLiteralOf(declaration.initializer);
      for (const property of object?.properties ?? []) {
        if (!ts.isMethodDeclaration(property) || !property.body) continue;
        if (!ts.isIdentifier(property.name)) continue;
        const body = source
          .slice(property.body.getStart(file) + 1, property.body.getEnd() - 1)
          .replace(/^\s*\n/, "")
          .trimEnd();
        const indented = dedent(body)
          .split("\n")
          .map((line) => (line.length > 0 ? `  ${line}` : line))
          .join("\n");
        examples.set(
          property.name.text,
          `function ${property.name.text}Example() {\n${indented}\n}`,
        );
      }
    }
  }
  return examples;
}
