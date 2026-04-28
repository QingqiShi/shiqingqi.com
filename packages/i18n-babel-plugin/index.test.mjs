import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transformSync } from "@babel/core";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pluginPath = require.resolve("./index");

/**
 * Transform code using the i18n Babel plugin.
 * Uses parserOpts to enable TypeScript + JSX parsing since
 * @babel/plugin-syntax-typescript is not installed.
 * @param {string} code
 * @param {string} [filename]
 * @returns {string}
 */
function transform(code, filename = "test.tsx") {
  const result = transformSync(code, {
    filename,
    parserOpts: {
      plugins: ["typescript", "jsx"],
    },
    plugins: [pluginPath],
    configFile: false,
    babelrc: false,
  });
  if (!result || result.code == null) {
    throw new Error("Transform returned no code");
  }
  return result.code;
}

/**
 * Generate the same content-hash key the plugin uses internally.
 * This duplicates the algorithm so tests can assert on expected keys.
 * @param {string} en
 * @param {string} zh
 * @returns {string}
 */
function expectedKey(en, zh) {
  return createHash("sha256")
    .update(en + "\0" + zh)
    .digest("hex")
    .slice(0, 8);
}

describe("i18n-babel-plugin", () => {
  describe("server component transform (no 'use client')", () => {
    it("transforms t() call to __i18n_lookup with correct key", () => {
      const input = `
import { t } from "#src/i18n";
const msg = t({ en: "Hello", zh: "你好" });
`;
      const output = transform(input);
      const key = expectedKey("Hello", "你好");

      expect(output).toContain(`__i18n_lookup("${key}")`);
      expect(output).toContain(
        `import { __i18n_lookup } from "#src/i18n/server-runtime.ts"`,
      );
      // Original import should be removed
      expect(output).not.toContain(`from "#src/i18n"`);
    });

    it("transforms t() with parse option to __i18n_lookupParse", () => {
      const input = `
import { t } from "#src/i18n";
const msg = t({ en: "Hello <strong>world</strong>", zh: "你好 <strong>世界</strong>" }, { parse: true });
`;
      const output = transform(input);
      const key = expectedKey(
        "Hello <strong>world</strong>",
        "你好 <strong>世界</strong>",
      );

      expect(output).toContain(`__i18n_lookupParse("${key}")`);
      expect(output).toContain(
        `import { __i18n_lookupParse } from "#src/i18n/server-runtime.ts"`,
      );
    });
  });

  describe("client component transform ('use client')", () => {
    it("transforms t() call to useI18nLookup with correct key", () => {
      const input = `
"use client";
import { t } from "#src/i18n";
const msg = t({ en: "Hello", zh: "你好" });
`;
      const output = transform(input);
      const key = expectedKey("Hello", "你好");

      expect(output).toContain(`useI18nLookup("${key}")`);
      expect(output).toContain(
        `import { useI18nLookup } from "#src/i18n/client-runtime.ts"`,
      );
      expect(output).not.toContain(`from "#src/i18n"`);
    });

    it("transforms t() with parse option to useI18nLookupParse", () => {
      const input = `
"use client";
import { t } from "#src/i18n";
const msg = t({ en: "Click <strong>here</strong>", zh: "点击 <strong>这里</strong>" }, { parse: true });
`;
      const output = transform(input);
      const key = expectedKey(
        "Click <strong>here</strong>",
        "点击 <strong>这里</strong>",
      );

      expect(output).toContain(`useI18nLookupParse("${key}")`);
      expect(output).toContain(
        `import { useI18nLookupParse } from "#src/i18n/client-runtime.ts"`,
      );
    });
  });

  describe("multiple t() calls", () => {
    it("generates one import statement with all needed functions", () => {
      const input = `
import { t } from "#src/i18n";
const greeting = t({ en: "Hello", zh: "你好" });
const farewell = t({ en: "Goodbye", zh: "再见" });
const rich = t({ en: "Hello <b>world</b>", zh: "你好 <b>世界</b>" }, { parse: true });
`;
      const output = transform(input);
      const keyHello = expectedKey("Hello", "你好");
      const keyGoodbye = expectedKey("Goodbye", "再见");
      const keyRich = expectedKey("Hello <b>world</b>", "你好 <b>世界</b>");

      // All three calls should be transformed
      expect(output).toContain(`__i18n_lookup("${keyHello}")`);
      expect(output).toContain(`__i18n_lookup("${keyGoodbye}")`);
      expect(output).toContain(`__i18n_lookupParse("${keyRich}")`);

      // Should have a single import with both functions
      expect(output).toContain("__i18n_lookup");
      expect(output).toContain("__i18n_lookupParse");

      // Only one import from server-runtime
      const importMatches = output.match(
        /import .* from "#src\/i18n\/server-runtime\.ts"/g,
      );
      expect(importMatches).toHaveLength(1);
    });

    it("generates correct distinct keys for different strings", () => {
      const input = `
import { t } from "#src/i18n";
const a = t({ en: "Apple", zh: "苹果" });
const b = t({ en: "Banana", zh: "香蕉" });
`;
      const output = transform(input);
      const keyApple = expectedKey("Apple", "苹果");
      const keyBanana = expectedKey("Banana", "香蕉");

      expect(keyApple).not.toBe(keyBanana);
      expect(output).toContain(`__i18n_lookup("${keyApple}")`);
      expect(output).toContain(`__i18n_lookup("${keyBanana}")`);
    });
  });

  describe("import removal", () => {
    it("removes the original t import from #src/i18n", () => {
      const input = `
import { t } from "#src/i18n";
const msg = t({ en: "Hello", zh: "你好" });
`;
      const output = transform(input);

      expect(output).not.toContain(`from "#src/i18n"`);
      expect(output).not.toMatch(/from ['"]#src\/i18n['"]/);
    });

    it("removes the original t import from #src/i18n.ts", () => {
      const input = `
import { t } from "#src/i18n.ts";
const msg = t({ en: "Hello", zh: "你好" });
`;
      const output = transform(input);

      expect(output).not.toContain(`from "#src/i18n.ts"`);
    });

    it("preserves other specifiers when t is co-imported", () => {
      const input = `
import { t, _setLocale, _getLocale } from "#src/i18n";
_setLocale("zh");
const msg = t({ en: "Hello", zh: "你好" });
const locale = _getLocale();
`;
      const output = transform(input);
      const key = expectedKey("Hello", "你好");

      // t() should be transformed
      expect(output).toContain(`__i18n_lookup("${key}")`);
      // _setLocale and _getLocale should still be imported from the original module
      expect(output).toContain("_setLocale");
      expect(output).toContain("_getLocale");
      expect(output).toMatch(/from ['"]#src\/i18n['"]/);
    });
  });

  describe("no-op cases", () => {
    it("leaves files without t import unchanged", () => {
      const input = `
const x = 42;
const y = x + 1;
`;
      const output = transform(input);

      expect(output).toContain("const x = 42");
      expect(output).not.toContain("__i18n");
    });

    it("removes unused t import but does not inject runtime imports", () => {
      const input = `
import { t } from "#src/i18n";
const x = 42;
`;
      const output = transform(input);

      // Original import removed
      expect(output).not.toContain(`from "#src/i18n"`);
      // No runtime imports injected since t was never called
      expect(output).not.toContain("__i18n");
      expect(output).not.toContain("server-runtime");
      expect(output).not.toContain("client-runtime");
    });

    it("ignores t from a different module", () => {
      const input = `
import { t } from "other-module";
const msg = t({ en: "Hello", zh: "你好" });
`;
      const output = transform(input);

      // Should be untouched — t is from a different module
      expect(output).toContain(`from "other-module"`);
      expect(output).toContain("t({");
      expect(output).not.toContain("__i18n");
    });
  });

  describe("resolved relative paths", () => {
    it("transforms t() imported via resolved relative path to i18n.ts", () => {
      const input = `
import { t } from "../../i18n.ts";
const msg = t({ en: "Hello", zh: "你好" });
`;
      const output = transform(input);
      const key = expectedKey("Hello", "你好");

      expect(output).toContain(`__i18n_lookup("${key}")`);
      expect(output).not.toContain(`from "../../i18n.ts"`);
    });

    it("transforms t() imported via resolved path without extension", () => {
      const input = `
import { t } from "../../../i18n";
const msg = t({ en: "Hello", zh: "你好" });
`;
      const output = transform(input);
      const key = expectedKey("Hello", "你好");

      expect(output).toContain(`__i18n_lookup("${key}")`);
    });

    it("ignores imports from modules that merely end with i18n in the name", () => {
      const input = `
import { t } from "some-lib/not-our-i18n";
const msg = t({ en: "Hello", zh: "你好" });
`;
      const output = transform(input);

      expect(output).toContain("t({");
      expect(output).not.toContain("__i18n");
    });
  });

  describe("aliased import", () => {
    it("handles import { t as translate }", () => {
      const input = `
import { t as translate } from "#src/i18n";
const msg = translate({ en: "Hello", zh: "你好" });
`;
      const output = transform(input);
      const key = expectedKey("Hello", "你好");

      expect(output).toContain(`__i18n_lookup("${key}")`);
      expect(output).not.toContain("translate(");
      expect(output).not.toContain(`from "#src/i18n"`);
    });
  });

  describe("invalid t() calls", () => {
    it("throws on t() with a string argument", () => {
      const input = `
import { t } from "#src/i18n";
const msg = t("not an object");
`;
      expect(() => transform(input)).toThrow(/Invalid t\(\) call/);
    });

    it("throws on t() with missing en property", () => {
      const input = `
import { t } from "#src/i18n";
const msg = t({ zh: "你好" });
`;
      expect(() => transform(input)).toThrow(/Invalid t\(\) call/);
    });

    it("throws on t() with non-literal values", () => {
      const input = `
import { t } from "#src/i18n";
const en = "Hello";
const msg = t({ en: en, zh: "你好" });
`;
      expect(() => transform(input)).toThrow(/Invalid t\(\) call/);
    });

    it("throws on t() with template literals containing interpolation", () => {
      const input = `
import { t } from "#src/i18n";
const name = "World";
const msg = t({ en: \`Hello \${name}\`, zh: \`你好\${name}\` });
`;
      expect(() => transform(input)).toThrow(/Invalid t\(\) call/);
      expect(() => transform(input)).toThrow(/Template literals/);
    });
  });

  describe("key determinism", () => {
    it("produces the same key for the same translation pair", () => {
      const key1 = expectedKey("Hello", "你好");
      const key2 = expectedKey("Hello", "你好");

      expect(key1).toBe(key2);
      expect(key1).toHaveLength(8);
    });

    it("produces different keys for different translation pairs", () => {
      const key1 = expectedKey("Hello", "你好");
      const key2 = expectedKey("World", "世界");

      expect(key1).not.toBe(key2);
    });
  });

  describe("key parity with hash.js", () => {
    it("produces identical keys to packages/i18n-codegen/hash.js", async () => {
      // Dynamically import the ESM hash module
      const hashModulePath = path.resolve(
        __dirname,
        "..",
        "i18n-codegen",
        "hash.js",
      );
      const { generateKey } = await import(hashModulePath);

      const testPairs = [
        ["Hello", "你好"],
        ["Goodbye", "再见"],
        ["Hello <strong>world</strong>", "你好 <strong>世界</strong>"],
        ["", ""],
        [
          "A longer string with special characters: <em>test</em> & more!",
          "一段较长的特殊字符文本",
        ],
      ];

      for (const [en, zh] of testPairs) {
        expect(expectedKey(en, zh)).toBe(generateKey(en, zh));
      }
    });
  });

  describe("only imports used functions", () => {
    it("only imports __i18n_lookup when no parse calls exist", () => {
      const input = `
import { t } from "#src/i18n";
const msg = t({ en: "Hello", zh: "你好" });
`;
      const output = transform(input);

      expect(output).toContain("__i18n_lookup");
      expect(output).not.toContain("__i18n_lookupParse");
    });

    it("only imports __i18n_lookupParse when only parse calls exist", () => {
      const input = `
import { t } from "#src/i18n";
const msg = t({ en: "Hello", zh: "你好" }, { parse: true });
`;
      const output = transform(input);

      expect(output).toContain("__i18n_lookupParse");
      // Should NOT contain __i18n_lookup as a standalone import (only __i18n_lookupParse)
      const importLine = output
        .split("\n")
        .find((line) => line.includes("server-runtime"));
      expect(importLine).toContain("__i18n_lookupParse");
      expect(importLine).not.toMatch(/\b__i18n_lookup\b(?!Parse)/);
    });

    it("imports both when both are used", () => {
      const input = `
import { t } from "#src/i18n";
const plain = t({ en: "Hello", zh: "你好" });
const rich = t({ en: "Hello <b>world</b>", zh: "你好 <b>世界</b>" }, { parse: true });
`;
      const output = transform(input);

      const importLine = output
        .split("\n")
        .find((line) => line.includes("server-runtime"));
      expect(importLine).toContain("__i18n_lookup");
      expect(importLine).toContain("__i18n_lookupParse");
    });
  });

  describe("manifest-based page wrapping", () => {
    const manifestPath = path.join(
      os.tmpdir(),
      "i18n-babel-plugin-test-manifest.json",
    );
    const fakeRoot = "/fake/project";

    const manifest = {
      "src/app/[locale]/movie-database/(list)/page.tsx":
        "movie-database-list-page",
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifest));

    /**
     * Transform with manifest-based wrapping enabled.
     * @param {string} code
     * @param {string} filename
     * @returns {string}
     */
    function transformWithManifest(code, filename) {
      const result = transformSync(code, {
        filename,
        parserOpts: { plugins: ["typescript", "jsx"] },
        plugins: [[pluginPath, { manifestPath, rootDir: fakeRoot }]],
        configFile: false,
        babelrc: false,
      });
      if (!result || result.code == null) {
        throw new Error("Transform returned no code");
      }
      return result.code;
    }

    it("wraps default export return with I18nContext for manifest-matched page", () => {
      const input = `
import { t } from "#src/i18n";
export default function Page() {
  return <div>{t({ en: "Hello", zh: "你好" })}</div>;
}
`;
      const filename = path.join(
        fakeRoot,
        "src/app/[locale]/movie-database/(list)/page.tsx",
      );
      const output = transformWithManifest(input, filename);

      expect(output).toContain("__I18nProvider");
      expect(output).toContain("__getClientTx");
      expect(output).toContain("#src/i18n/client-translations-provider.tsx");
      expect(output).toContain(
        "#src/_generated/i18n/client-loaders/movie-database-list-page.ts",
      );
    });

    it("does not wrap files not in the manifest", () => {
      const input = `
import { t } from "#src/i18n";
export default function Page() {
  return <div>{t({ en: "Hello", zh: "你好" })}</div>;
}
`;
      const filename = path.join(
        fakeRoot,
        "src/app/[locale]/calculator/page.tsx",
      );
      const output = transformWithManifest(input, filename);

      expect(output).not.toContain("__I18nProvider");
      expect(output).not.toContain("__getClientTx");
    });

    it("wraps async function default exports", () => {
      const input = `
import { t } from "#src/i18n";
export default async function Page() {
  const data = await fetch("...");
  return <div>{t({ en: "Hello", zh: "你好" })}</div>;
}
`;
      const filename = path.join(
        fakeRoot,
        "src/app/[locale]/movie-database/(list)/page.tsx",
      );
      const output = transformWithManifest(input, filename);

      expect(output).toContain("__I18nProvider");
      expect(output).toContain("__getClientTx");
    });

    it("does not wrap returns inside nested callbacks", () => {
      const input = `
import { t } from "#src/i18n";
export default function Page() {
  const items = [1, 2].map((i) => {
    return <span key={i}>{t({ en: "Item", zh: "项目" })}</span>;
  });
  return <div>{items}</div>;
}
`;
      const filename = path.join(
        fakeRoot,
        "src/app/[locale]/movie-database/(list)/page.tsx",
      );
      const output = transformWithManifest(input, filename);

      // Count how many __I18nCtx opening tags appear — should be exactly 1
      // (only the page-level return, not the nested callback return)
      const matches = output.match(/<__I18nProvider/g);
      expect(matches).toHaveLength(1);
    });

    it("auto-injects setLocale for page files with t() calls", () => {
      const input = `
import { t } from "#src/i18n";
export default function Page() {
  return <div>{t({ en: "Hello", zh: "你好" })}</div>;
}
`;
      const filename = path.join(
        fakeRoot,
        "src/app/[locale]/movie-database/(list)/page.tsx",
      );
      const output = transformWithManifest(input, filename);

      // Should inject setLocale and validateLocale
      expect(output).toContain("__setLocale");
      expect(output).toContain("__validateLocale");
      expect(output).toContain("#src/i18n/server-locale.ts");
      expect(output).toContain("#src/utils/validate-locale.ts");
      // Function should be made async
      expect(output).toMatch(/async function Page/);
      // Should have params extraction
      expect(output).toContain("await");
      expect(output).toContain(".params");
    });

    it("skips setLocale injection for files not under [locale]", () => {
      const input = `
import { t } from "#src/i18n";
const msg = t({ en: "Hello", zh: "你好" });
`;
      const filename = path.join(fakeRoot, "src/components/some-component.tsx");
      const output = transformWithManifest(input, filename);

      expect(output).not.toContain("__setLocale");
    });

    it("auto-injects setLocale into generateMetadata in layout files", () => {
      const input = `
import { t } from "#src/i18n";
export function generateMetadata(_props) {
  return { title: t({ en: "Hello", zh: "你好" }) };
}
export default function Layout({ children }) {
  return children;
}
`;
      const filename = path.join(
        fakeRoot,
        "src/app/[locale]/movie-database/(list)/layout.tsx",
      );
      const output = transformWithManifest(input, filename);

      // generateMetadata should get setLocale injection
      expect(output).toContain("__setLocale");
      expect(output).toContain("__validateLocale");
      expect(output).toMatch(/async function generateMetadata/);
      expect(output).toContain("await");
      expect(output).toContain(".params");
    });

    it("does not inject setLocale into layout default export", () => {
      const input = `
import { t } from "#src/i18n";
export function generateMetadata(_props) {
  return { title: t({ en: "Hello", zh: "你好" }) };
}
export default function Layout({ children }) {
  return children;
}
`;
      const filename = path.join(
        fakeRoot,
        "src/app/[locale]/movie-database/(list)/layout.tsx",
      );
      const output = transformWithManifest(input, filename);

      // Layout's default export should NOT be made async
      expect(output).not.toMatch(/async function Layout/);
    });

    it("skips setLocale injection when already imported", () => {
      const input = `
import { t } from "#src/i18n";
import { setLocale } from "#src/i18n/server-locale.ts";
export default async function Page(props) {
  const params = await props.params;
  setLocale(params.locale);
  return <div>{t({ en: "Hello", zh: "你好" })}</div>;
}
`;
      const filename = path.join(
        fakeRoot,
        "src/app/[locale]/movie-database/(list)/page.tsx",
      );
      const output = transformWithManifest(input, filename);

      // Should NOT inject __setLocale since setLocale is already imported
      expect(output).not.toContain("__setLocale");
      // Original setLocale should still be present
      expect(output).toContain("setLocale");
    });

    it("skips setLocale injection for client components", () => {
      const input = `
"use client";
import { t } from "#src/i18n";
export default function Page() {
  return <div>{t({ en: "Hello", zh: "你好" })}</div>;
}
`;
      const filename = path.join(
        fakeRoot,
        "src/app/[locale]/movie-database/(list)/page.tsx",
      );
      const output = transformWithManifest(input, filename);

      expect(output).not.toContain("__setLocale");
    });

    it("injects wrapping even without t() calls in the file", () => {
      const input = `
export default function Page() {
  return <div>No translations</div>;
}
`;
      const filename = path.join(
        fakeRoot,
        "src/app/[locale]/movie-database/(list)/page.tsx",
      );
      const output = transformWithManifest(input, filename);

      // Wrapping should still be injected because client children
      // (in other files) need the translations context
      expect(output).toContain("__I18nProvider");
      expect(output).toContain("__getClientTx");
    });
  });
});
