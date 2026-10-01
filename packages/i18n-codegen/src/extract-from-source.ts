import { parse } from "@babel/parser";
import traverse, { type NodePath } from "@babel/traverse";
import type { CallExpression, ImportDeclaration } from "@babel/types";
import * as types from "@babel/types";
import { extractTranslations } from "@tuja/babel-plugins/i18n/extract-translations";
import { generateKey } from "@tuja/babel-plugins/i18n/generate-key";
import { isI18nModuleSource } from "@tuja/babel-plugins/i18n/is-i18n-module-source";

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
      if (!isI18nModuleSource(path.node.source.value)) return;

      for (const specifier of path.node.specifiers) {
        if (
          types.isImportSpecifier(specifier) &&
          types.isIdentifier(specifier.imported) &&
          specifier.imported.name === "t"
        ) {
          tBindings.add(specifier.local.name);
        }
      }
    },

    CallExpression(path: NodePath<CallExpression>) {
      const callee = path.node.callee;
      if (!types.isIdentifier(callee)) return;
      if (!tBindings.has(callee.name)) return;

      const args = path.node.arguments;
      if (args.length === 0) return;

      const firstArg = args[0];
      const translations = extractTranslations(types, firstArg);
      if (!translations) {
        warnings.push({
          type: "non-literal",
          message: `t() first argument must be an object with "en" and "zh" string literal properties (got ${firstArg.type})`,
          file: filePath,
          line: firstArg.loc?.start.line ?? 0,
        });
        return;
      }

      entries.push({
        key: generateKey(translations.en, translations.zh),
        en: translations.en,
        zh: translations.zh,
        files: [filePath],
        line: firstArg.loc?.start.line ?? 0,
      });
    },
  });

  return { entries, warnings };
}
