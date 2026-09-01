import { describe, it, expect } from "vitest";
import { extractFromSource } from "./extract-from-source.ts";
import { mergeResults } from "./merge-results.ts";

describe("mergeResults", () => {
  it("merges entries from multiple results", () => {
    const result1 = extractFromSource(
      `
      import { t } from "#src/i18n";
      t({ en: "Hello", zh: "你好" });
    `,
      "file1.tsx",
    );

    const result2 = extractFromSource(
      `
      import { t } from "#src/i18n";
      t({ en: "Goodbye", zh: "再见" });
    `,
      "file2.tsx",
    );

    const merged = mergeResults([result1, result2]);
    expect(merged.entries).toHaveLength(2);
  });

  it("deduplicates identical translations across files but tracks every source file", () => {
    const result1 = extractFromSource(
      `
      import { t } from "#src/i18n";
      t({ en: "Hello", zh: "你好" });
    `,
      "file1.tsx",
    );

    const result2 = extractFromSource(
      `
      import { t } from "#src/i18n";
      t({ en: "Hello", zh: "你好" });
    `,
      "file2.tsx",
    );

    const merged = mergeResults([result1, result2]);
    expect(merged.entries).toHaveLength(1);
    expect(merged.entries[0].files).toEqual(["file1.tsx", "file2.tsx"]);
    expect(merged.warnings).toHaveLength(0);
  });

  it("does not register the same file twice when a translation appears multiple times in one file", () => {
    const result = extractFromSource(
      `
      import { t } from "#src/i18n";
      t({ en: "Hello", zh: "你好" });
      t({ en: "Hello", zh: "你好" });
    `,
      "file1.tsx",
    );

    const merged = mergeResults([result]);
    expect(merged.entries).toHaveLength(1);
    expect(merged.entries[0].files).toEqual(["file1.tsx"]);
  });

  it("keeps both entries when same English has different Chinese translations", () => {
    const result1 = extractFromSource(
      `
      import { t } from "#src/i18n";
      t({ en: "Hello", zh: "你好" });
    `,
      "file1.tsx",
    );

    const result2 = extractFromSource(
      `
      import { t } from "#src/i18n";
      t({ en: "Hello", zh: "嗨" });
    `,
      "file2.tsx",
    );

    const merged = mergeResults([result1, result2]);
    // Different zh values produce different keys, so both are kept
    expect(merged.entries).toHaveLength(2);
    expect(merged.warnings).toHaveLength(0);
  });

  it("collects warnings from all results", () => {
    const result1 = extractFromSource(
      `
      import { t } from "#src/i18n";
      const x = { en: "Hello", zh: "你好" };
      t(x);
    `,
      "file1.tsx",
    );

    const result2 = extractFromSource(
      `
      import { t } from "#src/i18n";
      const y = { en: "Bye", zh: "再见" };
      t(y);
    `,
      "file2.tsx",
    );

    const merged = mergeResults([result1, result2]);
    expect(merged.warnings).toHaveLength(2);
  });
});
