import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import type { File as BabelFile } from "@babel/types";

const SRC_ALIAS = "#src/";
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

/**
 * Resolve an import specifier to an absolute file path.
 * Returns null if the import can't be resolved (external package, etc.).
 */
export function resolveImport(
  specifier: string,
  fromFile: string,
  srcDir: string,
): string | null {
  const cacheKey = `${specifier}\0${fromFile}`;
  const cached = resolveCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const result = resolveImportUncached(specifier, fromFile, srcDir);
  resolveCache.set(cacheKey, result);
  return result;
}

function resolveImportUncached(
  specifier: string,
  fromFile: string,
  srcDir: string,
): string | null {
  let basePath: string;

  if (specifier.startsWith(SRC_ALIAS)) {
    basePath = path.join(srcDir, specifier.slice(SRC_ALIAS.length));
  } else if (specifier.startsWith(".")) {
    basePath = path.resolve(path.dirname(fromFile), specifier);
  } else {
    // External package — not a source file
    return null;
  }

  // Try the path as-is (might already include extension)
  if (isFile(basePath)) return basePath;

  // Try adding source extensions
  for (const ext of SOURCE_EXTENSIONS) {
    const withExt = basePath + ext;
    if (isFile(withExt)) return withExt;
  }

  // Try index files
  for (const ext of SOURCE_EXTENSIONS) {
    const indexPath = path.join(basePath, `index${ext}`);
    if (isFile(indexPath)) return indexPath;
  }

  return null;
}

// Caches persist across multiple traceClientFiles() calls within a
// single codegen run, avoiding redundant filesystem and parse work
// when many page entry points share the same imported modules.
const parseCache = new Map<string, BabelFile | null>();
const resolveCache = new Map<string, string | null>();
const isFileCache = new Map<string, boolean>();

function isFile(filePath: string): boolean {
  const cached = isFileCache.get(filePath);
  if (cached !== undefined) return cached;
  let result: boolean;
  try {
    result = fs.statSync(filePath).isFile();
  } catch {
    result = false;
  }
  isFileCache.set(filePath, result);
  return result;
}

function parseSourceFile(filePath: string): BabelFile | null {
  const cached = parseCache.get(filePath);
  if (cached !== undefined) return cached;
  let result: BabelFile | null;
  try {
    const code = fs.readFileSync(filePath, "utf8");
    result = parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
    });
  } catch {
    result = null;
  }
  parseCache.set(filePath, result);
  return result;
}

function hasUseClient(ast: BabelFile): boolean {
  return ast.program.directives.some((d) => d.value.value === "use client");
}

/**
 * Extract runtime import sources from an AST (skips type-only imports).
 */
function getImportSources(ast: BabelFile): string[] {
  const sources: string[] = [];
  for (const node of ast.program.body) {
    if (node.type === "ImportDeclaration" && node.importKind !== "type") {
      sources.push(node.source.value);
    } else if (
      node.type === "ExportNamedDeclaration" &&
      node.source &&
      node.exportKind !== "type"
    ) {
      sources.push(node.source.value);
    } else if (node.type === "ExportAllDeclaration" && node.source) {
      sources.push(node.source.value);
    }
  }
  return sources;
}

function shouldSkip(filePath: string): boolean {
  const parts = filePath.split(path.sep);
  return parts.some((p) => p === "node_modules" || p === "_generated");
}

/**
 * Trace from a page/layout entry point and return all source files
 * reachable through client component boundaries.
 *
 * The algorithm:
 * 1. From server components: recurse through imports until hitting "use client"
 * 2. When hitting "use client": switch to client mode — recurse through ALL
 *    imports (they are implicitly client-side) and collect every file
 * 3. The caller should cross-reference with extraction results to filter
 *    down to files that actually contain t() calls
 */
export function traceClientFiles(
  entryFile: string,
  srcDir: string,
): Set<string> {
  const serverVisited = new Set<string>();
  const clientFiles = new Set<string>();

  function traceServer(filePath: string): void {
    if (serverVisited.has(filePath) || clientFiles.has(filePath)) return;
    serverVisited.add(filePath);

    const ast = parseSourceFile(filePath);
    if (!ast) return;

    if (hasUseClient(ast)) {
      traceClient(filePath, ast);
      return;
    }

    for (const source of getImportSources(ast)) {
      const resolved = resolveImport(source, filePath, srcDir);
      if (resolved && !shouldSkip(resolved)) {
        traceServer(resolved);
      }
    }
  }

  function traceClient(filePath: string, existingAst?: BabelFile): void {
    if (clientFiles.has(filePath)) return;
    clientFiles.add(filePath);

    const ast = existingAst ?? parseSourceFile(filePath);
    if (!ast) return;

    for (const source of getImportSources(ast)) {
      const resolved = resolveImport(source, filePath, srcDir);
      if (resolved && !shouldSkip(resolved)) {
        traceClient(resolved);
      }
    }
  }

  traceServer(entryFile);
  return clientFiles;
}
