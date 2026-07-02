import type {
  CallExpression,
  Expression,
  File,
  ImportDeclaration,
  ImportSpecifier,
  ObjectExpression,
  ObjectProperty,
} from "@babel/types";
import type { ColorSourcePlan, ScalarSourcePlan } from "./apply-plan.ts";

// Deterministic, dependency-light editor for `packages/ui/src/tokens.stylex.ts`.
// Pure: source string in -> source string out, or throws TokenEditError. No fs,
// no Next, no globals, so it tests against fixture strings with zero mocks.
//
// It edits exactly one value node per call via a source-span splice (never
// @babel/generator on the whole file, which would reflow formatting and drop
// the StyleX-significant comments). @babel/parser is imported dynamically so the
// dev-only route never pulls a devDependency onto the production path; node
// shapes are matched with `.type` discriminants so there is no runtime
// dependency on @babel/types (its types are erased at build).

/** A token whose source value could not be located/edited deterministically. */
export class TokenEditError extends Error {
  readonly token: string;

  constructor(token: string, message: string) {
    super(message);
    this.name = "TokenEditError";
    this.token = token;
  }
}

async function parseSource(source: string): Promise<File> {
  const { parse } = await import("@babel/parser");
  return parse(source, { sourceType: "module", plugins: ["typescript"] });
}

/** The initializer of a top-level `const <name> = …` (handles `export const`). */
function findDeclaratorInit(ast: File, name: string): Expression | null {
  for (const statement of ast.program.body) {
    const declaration =
      statement.type === "VariableDeclaration"
        ? statement
        : statement.type === "ExportNamedDeclaration" &&
            statement.declaration?.type === "VariableDeclaration"
          ? statement.declaration
          : null;
    if (!declaration) continue;
    for (const declarator of declaration.declarations) {
      if (
        declarator.id.type === "Identifier" &&
        declarator.id.name === name &&
        declarator.init
      ) {
        return declarator.init;
      }
    }
  }
  return null;
}

/** Non-computed own properties of `object` whose key matches `member`. */
function findProperties(
  object: ObjectExpression,
  member: string,
): ObjectProperty[] {
  const matches: ObjectProperty[] = [];
  for (const property of object.properties) {
    if (property.type !== "ObjectProperty" || property.computed) continue;
    const { key } = property;
    const keyName =
      key.type === "Identifier"
        ? key.name
        : key.type === "StringLiteral"
          ? key.value
          : null;
    if (keyName === member) matches.push(property);
  }
  return matches;
}

/** Resolve a single matching property, or throw a clear TokenEditError. */
function soleProperty(
  matches: ObjectProperty[],
  token: string,
  where: string,
): ObjectProperty {
  if (matches.length === 0) {
    throw new TokenEditError(token, `${token} not found in ${where}.`);
  }
  if (matches.length > 1) {
    throw new TokenEditError(token, `${token} is ambiguous in ${where}.`);
  }
  return matches[0];
}

function spanOf(
  node: { start?: number | null; end?: number | null },
  token: string,
): { start: number; end: number } {
  if (
    node.start === null ||
    node.start === undefined ||
    node.end === null ||
    node.end === undefined
  ) {
    throw new TokenEditError(token, `Missing source range for ${token}.`);
  }
  return { start: node.start, end: node.end };
}

function splice(source: string, start: number, end: number, text: string) {
  return source.slice(0, start) + text + source.slice(end);
}

function isStylexTypesCall(call: CallExpression): boolean {
  const { callee } = call;
  if (callee.type !== "MemberExpression" || callee.computed) return false;
  if (
    callee.property.type !== "Identifier" ||
    (callee.property.name !== "integer" && callee.property.name !== "number")
  ) {
    return false;
  }
  const { object } = callee;
  if (object.type !== "MemberExpression" || object.computed) return false;
  return (
    object.object.type === "Identifier" &&
    object.object.name === "stylex" &&
    object.property.type === "Identifier" &&
    object.property.name === "types"
  );
}

/** Generated palette hues live one file each under `hues/`; `<hue>` and `<hue>_rgb` share it. */
function paletteModuleFor(name: string): string {
  const hue = name.endsWith("_rgb") ? name.slice(0, -4) : name;
  return `./_generated/palette/hues/${hue}.stylex.ts`;
}

/**
 * Ensure `name` (a palette const like `gray` or `purple_rgb`) is imported in the
 * tokens file. A color edit can re-map a token to any system hue, but the file
 * only imports the hues it currently uses — writing `teal._50` without a matching
 * `import { teal } …` would break the build. If the hue's module is already
 * imported, `name` is appended to its specifier list; otherwise a new import is
 * inserted after the last import. A no-op when `name` is already in scope.
 */
export async function ensurePaletteImport(
  source: string,
  name: string,
): Promise<string> {
  const ast = await parseSource(source);
  const moduleSource = paletteModuleFor(name);
  let moduleImport: ImportDeclaration | null = null;
  let lastImportEnd = 0;
  for (const statement of ast.program.body) {
    if (statement.type !== "ImportDeclaration") continue;
    for (const specifier of statement.specifiers) {
      if (
        specifier.type === "ImportSpecifier" &&
        specifier.local.name === name
      ) {
        return source; // already imported
      }
    }
    if (statement.source.value === moduleSource) moduleImport = statement;
    const { end } = spanOf(statement, name);
    if (end > lastImportEnd) lastImportEnd = end;
  }

  if (moduleImport) {
    const specifiers = moduleImport.specifiers.filter(
      (specifier): specifier is ImportSpecifier =>
        specifier.type === "ImportSpecifier",
    );
    if (specifiers.length === 0) {
      throw new TokenEditError(
        name,
        `Cannot extend the ${moduleSource} import.`,
      );
    }
    const last = specifiers[specifiers.length - 1];
    const { end } = spanOf(last, name);
    return splice(source, end, end, `, ${name}`);
  }

  const importLine = `\nimport { ${name} } from "${moduleSource}";`;
  return splice(source, lastImportEnd, lastImportEnd, importLine);
}

/**
 * Replace the value of `<targetObject>.<member>` (the plain `light`/`dark`
 * object) with `plan.expression` — a complete source expression already chosen
 * by `planColorEdit` (a palette ref like `gray._20`, a backtick rgba recipe, or
 * a quoted string). Scoping to the top-level object ignores the many
 * `light.x`/`dark.x` references inside the `color` defineVars group.
 */
export async function applyColorEditToSource(
  source: string,
  member: string,
  plan: ColorSourcePlan,
): Promise<string> {
  const token = `color.${member}`;
  const ast = await parseSource(source);
  const init = findDeclaratorInit(ast, plan.targetObject);
  if (!init || init.type !== "ObjectExpression") {
    throw new TokenEditError(
      token,
      `Could not find the \`${plan.targetObject}\` token object.`,
    );
  }
  const property = soleProperty(
    findProperties(init, member),
    token,
    `\`${plan.targetObject}\``,
  );
  const { start, end } = spanOf(property.value, token);
  return splice(source, start, end, plan.expression);
}

/**
 * Replace the value of `<group>.<member>` inside the group's `defineVars` call.
 * Preserves a `stylex.types.integer(...)` / `stylex.types.number(...)` wrapper by
 * editing only its argument; otherwise replaces a quoted string literal.
 */
export async function applyScalarEditToSource(
  source: string,
  plan: ScalarSourcePlan,
): Promise<string> {
  const token = `${plan.group}.${plan.member}`;
  const ast = await parseSource(source);
  const init = findDeclaratorInit(ast, plan.group);
  if (!init || init.type !== "CallExpression") {
    throw new TokenEditError(
      token,
      `Could not find the \`${plan.group}\` defineVars group.`,
    );
  }
  if (init.arguments.length === 0) {
    throw new TokenEditError(
      token,
      `Unexpected shape for the \`${plan.group}\` defineVars group.`,
    );
  }
  const object = init.arguments[0];
  if (object.type !== "ObjectExpression") {
    throw new TokenEditError(
      token,
      `Unexpected shape for the \`${plan.group}\` defineVars group.`,
    );
  }
  const property = soleProperty(
    findProperties(object, plan.member),
    token,
    `\`${plan.group}\``,
  );
  const { value } = property;
  if (value.type === "CallExpression" && isStylexTypesCall(value)) {
    if (value.arguments.length === 0) {
      throw new TokenEditError(
        token,
        `Empty stylex.types wrapper for ${token}.`,
      );
    }
    const argument = value.arguments[0];
    const { start, end } = spanOf(argument, token);
    return splice(source, start, end, plan.value);
  }
  const { start, end } = spanOf(value, token);
  return splice(source, start, end, JSON.stringify(plan.value));
}
