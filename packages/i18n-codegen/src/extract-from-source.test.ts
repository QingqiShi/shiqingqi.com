import { generateKey } from "@tuja/babel-plugins/i18n/generate-key";
import { describe, it, expect } from "vitest";
import { extractFromSource } from "./extract-from-source.ts";

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
    expect(result.entries[0].files).toEqual(["test.tsx"]);
  });

  it("extracts t() calls imported through a relative path", () => {
    const code = `
      import { t } from "../../i18n.ts";
      const greeting = t({ en: "Hello", zh: "你好" });
    `;
    const result = extractFromSource(code, "test.tsx");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].key).toBe(generateKey("Hello", "你好"));
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

  it("handles renamed imports correctly", () => {
    const code = `
      import { t as translate } from "#src/i18n";
      const greeting = translate({ en: "Hello", zh: "你好" });
    `;
    const result = extractFromSource(code, "test.tsx");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].en).toBe("Hello");
  });
});
