import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import type { ComponentEntry } from "./collect-component-entries.ts";
import type { CollectContext } from "./collect-from-type-node.ts";
import {
  collectFromTypeNode,
  namedTypeReferenceOf,
  resolveTypeDeclaration,
  unwrapParens,
} from "./collect-from-type-node.ts";
import { mergeRecords, normalizeSpace } from "./merge-records.ts";
import type { PropsDoc } from "./types.ts";

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
function collectDestructuringDefaults(
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
    name: entry.name,
    component: entry.component,
    kind: entry.kind,
    source: path.relative(repoRoot, entry.file),
    ...(tag === undefined ? {} : { extendsHtml: tag }),
    props: mergeRecords(
      records,
      context.checker,
      collectDestructuringDefaults(fn),
    ),
  };
}

/**
 * Whether a hook's first parameter is typed as an exported interface —
 * `useDust` takes `DustOptions`. An exported options interface marks the
 * hooks whose options are public API, so only those get a document.
 */
function takesExportedOptions(
  program: ts.Program,
  entry: ComponentEntry,
): boolean {
  const sourceFile = program.getSourceFile(entry.file);
  const fn = sourceFile && findComponentFunction(sourceFile, entry.component);
  const typeNode = unwrapParens(fn?.parameters.at(0)?.type);
  const reference = typeNode && namedTypeReferenceOf(typeNode);
  if (!reference) return false;
  const declaration = resolveTypeDeclaration(
    reference,
    program.getTypeChecker(),
  );
  return (
    declaration !== undefined &&
    ts.isInterfaceDeclaration(declaration) &&
    (ts.getCombinedModifierFlags(declaration) & ts.ModifierFlags.Export) !== 0
  );
}

/**
 * One document per component, and one per hook that takes an exported
 * options interface, in export-subpath order.
 */
export function collectPropsDocs(
  program: ts.Program,
  entries: readonly ComponentEntry[],
  repoRoot: string,
): Map<string, PropsDoc> {
  const docs = new Map<string, PropsDoc>();
  for (const entry of entries) {
    if (entry.kind === "hook" && !takesExportedOptions(program, entry)) {
      continue;
    }
    docs.set(entry.name, collectPropsDoc(program, entry, repoRoot));
  }
  return docs;
}
