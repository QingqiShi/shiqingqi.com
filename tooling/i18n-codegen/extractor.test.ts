import { describe, it, expect } from "vitest";
import { generateKey } from "./hash.js";
import { extractFromSource, mergeResults } from "./extractor.ts";

describe("generateKey", () => {
  it("returns a deterministic 8-character hex string", () => {
    const key = generateKey("Hello", "你好");
    expect(key).toHaveLength(8);
    expect(key).toMatch(/^[0-9a-f]{8}$/);
  });

  it("produces the same key for the same input pair", () => {
    const key1 = generateKey("Hello", "你好");
    const key2 = generateKey("Hello", "你好");
    expect(key1).toBe(key2);
  });

  it("produces different keys for different English strings", () => {
    const key1 = generateKey("Hello", "你好");
    const key2 = generateKey("World", "世界");
    expect(key1).not.toBe(key2);
  });

  it("produces different keys for same English with different Chinese", () => {
    const key1 = generateKey("Save", "保存");
    const key2 = generateKey("Save", "存档");
    expect(key1).not.toBe(key2);
  });
});

describe("extractFromSource", () => {
  it("extracts t() calls imported from #src/i18n", () => {
    const code = `
      import { t } from "#src/i18n";
      const greeting = t({ en: "Hello", zh: "你好" });
    `;
    const result = extractFromSource(code, "test.tsx");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].en).toBe("Hello");
    expect(result.entries[0].zh).toBe("你好");
    expect(result.entries[0].key).toBe(generateKey("Hello", "你好"));
    expect(result.entries[0].file).toBe("test.tsx");
  });

  it("extracts t() calls imported from #src/i18n.ts", () => {
    const code = `
      import { t } from "#src/i18n.ts";
      const greeting = t({ en: "Hello", zh: "你好" });
    `;
    const result = extractFromSource(code, "test.tsx");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].en).toBe("Hello");
  });

  it("ignores t() calls not imported from #src/i18n", () => {
    const code = `
      import { t } from "other-lib";
      const greeting = t({ en: "Hello", zh: "你好" });
    `;
    const result = extractFromSource(code, "test.tsx");
    expect(result.entries).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("ignores t() calls when t is not imported at all", () => {
    const code = `
      function t(obj) { return obj.en; }
      const greeting = t({ en: "Hello", zh: "你好" });
    `;
    const result = extractFromSource(code, "test.tsx");
    expect(result.entries).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("handles t() with { parse: true } second argument", () => {
    const code = `
      import { t } from "#src/i18n";
      const bold = t({ en: "<strong>Bold</strong>", zh: "<strong>粗体</strong>" }, { parse: true });
    `;
    const result = extractFromSource(code, "test.tsx");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].en).toBe("<strong>Bold</strong>");
    expect(result.entries[0].zh).toBe("<strong>粗体</strong>");
  });

  it("extracts multiple t() calls from the same file", () => {
    const code = `
      import { t } from "#src/i18n";
      const hello = t({ en: "Hello", zh: "你好" });
      const goodbye = t({ en: "Goodbye", zh: "再见" });
      const thanks = t({ en: "Thanks", zh: "谢谢" });
    `;
    const result = extractFromSource(code, "test.tsx");
    expect(result.entries).toHaveLength(3);
    expect(result.entries.map((e) => e.en)).toEqual([
      "Hello",
      "Goodbye",
      "Thanks",
    ]);
  });

  it("warns about non-literal arguments", () => {
    const code = `
      import { t } from "#src/i18n";
      const key = { en: "Hello", zh: "你好" };
      const greeting = t(key);
    `;
    const result = extractFromSource(code, "test.tsx");
    expect(result.entries).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].type).toBe("non-literal");
    expect(result.warnings[0].file).toBe("test.tsx");
  });

  it("warns when en property is not a string literal", () => {
    const code = `
      import { t } from "#src/i18n";
      const enText = "Hello";
      const greeting = t({ en: enText, zh: "你好" });
    `;
    const result = extractFromSource(code, "test.tsx");
    expect(result.entries).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].type).toBe("non-literal");
  });

  it("returns empty results for files without t() calls", () => {
    const code = `
      const x = 1;
      function hello() { return "world"; }
    `;
    const result = extractFromSource(code, "test.tsx");
    expect(result.entries).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("returns empty results for files with no i18n import", () => {
    const code = `
      import React from "react";
      export function Component() { return <div>Hello</div>; }
    `;
    const result = extractFromSource(code, "test.tsx");
    expect(result.entries).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("handles renamed imports correctly", () => {
    const code = `
      import { t as translate } from "#src/i18n";
      const greeting = translate({ en: "Hello", zh: "你好" });
    `;
    const result = extractFromSource(code, "test.tsx");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].en).toBe("Hello");
  });

  it("handles TypeScript source with type annotations", () => {
    const code = `
      import { t } from "#src/i18n";
      interface Props { name: string; }
      function Component(props: Props): JSX.Element {
        return <div>{t({ en: "Welcome", zh: "欢迎" })}</div>;
      }
    `;
    const result = extractFromSource(code, "test.tsx");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].en).toBe("Welcome");
  });

  it("returns empty results for unparseable code", () => {
    const code = `this is not valid code {{{{`;
    const result = extractFromSource(code, "test.tsx");
    expect(result.entries).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});

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

  it("deduplicates identical translations across files", () => {
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
    expect(merged.warnings).toHaveLength(0);
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
