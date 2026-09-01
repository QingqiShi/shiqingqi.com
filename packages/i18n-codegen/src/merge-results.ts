import type {
  ExtractionResult,
  ExtractionWarning,
  TranslationEntry,
} from "./extract-from-source.ts";

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
