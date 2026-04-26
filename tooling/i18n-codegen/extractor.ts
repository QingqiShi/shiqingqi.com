import { parse } from "@babel/parser";
import type { NodePath } from "@babel/traverse";
import type { CallExpression, ImportDeclaration } from "@babel/types";
import {
  isIdentifier,
  isImportSpecifier,
  isObjectExpression,
  isObjectProperty,
  isStringLiteral,
} from "@babel/types";
import { generateKey } from "./hash.js";

// @babel/traverse is a CJS module whose default export is the traverse function.
// Dynamic import() resolves the CJS→ESM interop correctly in both tsx and vitest,
// and unlike createRequire it preserves type information from @types/babel__traverse.
const _traverseModule = await import("@babel/traverse");
const traverse = _traverseModule.default;

/** A single extracted translation entry. */
export interface TranslationEntry {
  key: string;
  en: string;
  zh: string;
  /**
   * All source files that contain this translation. After extraction this is a
   * single-element array; after `mergeResults` it lists every file whose t()
   * call shares the same key+content.
   */
  files: string[];
  /** Line of the first occurrence (best-effort, used for diagnostics). */
  line: number;
}

/** Warning produced during extraction. */
export interface ExtractionWarning {
  type: "non-literal" | "conflicting-translation";
  message: string;
  file: string;
  line: number;
}

/** Result of extracting translations from one or more files. */
export interface ExtractionResult {
  entries: TranslationEntry[];
  warnings: ExtractionWarning[];
}

const I18N_IMPORT_SOURCES = new Set(["#src/i18n", "#src/i18n.ts"]);

/**
 * Extract translations from a single source file's code string.
 */
export function extractFromSource(
  code: string,
  filePath: string,
): ExtractionResult {
  const entries: TranslationEntry[] = [];
  const warnings: ExtractionWarning[] = [];

  let ast;
  try {
    ast = parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
    });
  } catch {
    // If the file can't be parsed, return empty results
    return { entries, warnings };
  }

  // Track which local names are bound to `t` from the i18n module
  const tBindings = new Set<string>();

  traverse(ast, {
    ImportDeclaration(path: NodePath<ImportDeclaration>) {
      const source = path.node.source.value;
      if (!I18N_IMPORT_SOURCES.has(source)) return;

      for (const specifier of path.node.specifiers) {
        if (
          isImportSpecifier(specifier) &&
          isIdentifier(specifier.imported) &&
          specifier.imported.name === "t"
        ) {
          tBindings.add(specifier.local.name);
        }
      }
    },

    CallExpression(path: NodePath<CallExpression>) {
      const callee = path.node.callee;
      if (!isIdentifier(callee)) return;
      if (!tBindings.has(callee.name)) return;

      const args = path.node.arguments;
      if (args.length === 0) return;

      const firstArg = args[0];

      // Warn about non-literal arguments
      if (!isObjectExpression(firstArg)) {
        warnings.push({
          type: "non-literal",
          message: `t() called with non-literal argument (${firstArg.type})`,
          file: filePath,
          line: firstArg.loc?.start.line ?? 0,
        });
        return;
      }

      let enValue: string | undefined;
      let zhValue: string | undefined;

      for (const prop of firstArg.properties) {
        if (!isObjectProperty(prop)) continue;

        const key = prop.key;
        let keyName: string | undefined;

        if (isIdentifier(key)) {
          keyName = key.name;
        } else if (isStringLiteral(key)) {
          keyName = key.value;
        }

        if (keyName === "en" && isStringLiteral(prop.value)) {
          enValue = prop.value.value;
        } else if (keyName === "zh" && isStringLiteral(prop.value)) {
          zhValue = prop.value.value;
        }
      }

      if (enValue === undefined || zhValue === undefined) {
        // If we have an ObjectExpression but can't extract string literals for en/zh
        if (enValue === undefined && zhValue === undefined) {
          warnings.push({
            type: "non-literal",
            message: `t() called with object missing string literal 'en' and 'zh' properties`,
            file: filePath,
            line: firstArg.loc?.start.line ?? 0,
          });
        } else if (enValue === undefined) {
          warnings.push({
            type: "non-literal",
            message: `t() called with object missing string literal 'en' property`,
            file: filePath,
            line: firstArg.loc?.start.line ?? 0,
          });
        } else {
          warnings.push({
            type: "non-literal",
            message: `t() called with object missing string literal 'zh' property`,
            file: filePath,
            line: firstArg.loc?.start.line ?? 0,
          });
        }
        return;
      }

      const hashKey = generateKey(enValue, zhValue);
      entries.push({
        key: hashKey,
        en: enValue,
        zh: zhValue,
        files: [filePath],
        line: firstArg.loc?.start.line ?? 0,
      });
    },
  });

  return { entries, warnings };
}

/**
 * Merge extraction results from multiple files, detecting conflicts.
 *
 * When the same translation appears in multiple files, the merged entry
 * lists every source file in `files` so per-page bundle generation can
 * find the key for every page that uses it.
 */
export function mergeResults(results: ExtractionResult[]): ExtractionResult {
  const mergedEntries: TranslationEntry[] = [];
  const mergedWarnings: ExtractionWarning[] = [];
  const entriesByKey = new Map<string, TranslationEntry>();

  for (const result of results) {
    mergedWarnings.push(...result.warnings);

    for (const entry of result.entries) {
      const existing = entriesByKey.get(entry.key);

      if (existing) {
        // Same key, same content = duplicate across files → record every file
        if (existing.en === entry.en && existing.zh === entry.zh) {
          for (const file of entry.files) {
            if (!existing.files.includes(file)) {
              existing.files.push(file);
            }
          }
          continue;
        }

        // Different content but same hash = true collision
        mergedWarnings.push({
          type: "conflicting-translation",
          message:
            `Hash collision: key "${entry.key}" maps to both ` +
            `("${existing.en}", "${existing.zh}") and ("${entry.en}", "${entry.zh}"). ` +
            `One translation will be lost. Change one of the strings slightly to resolve.`,
          file: entry.files[0],
          line: entry.line,
        });
        continue;
      }

      const merged: TranslationEntry = {
        key: entry.key,
        en: entry.en,
        zh: entry.zh,
        files: [...entry.files],
        line: entry.line,
      };
      entriesByKey.set(entry.key, merged);
      mergedEntries.push(merged);
    }
  }

  return { entries: mergedEntries, warnings: mergedWarnings };
}
