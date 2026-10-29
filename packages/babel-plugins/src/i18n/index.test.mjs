import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { transformSync, types } from "@babel/core";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

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

describe("i18n", () => {
  describe("server component transform (no 'use client')", () => {
    it("transforms t() call to __i18n_lookup with correct key", () => {
      const input = `
import { t } from "@tuja/i18n";
const msg = t({ en: "Hello", zh: "你好" });
`;
      const output = transform(input);
      const key = expectedKey("Hello", "你好");

      expect(output).toContain(`__i18n_lookup("${key}")`);
      expect(output).toContain(
        `import { __i18n_lookup } from "#src/i18n/server-runtime.ts"`,
      );
      // Original import should be removed
      expect(output).not.toContain(`from "@tuja/i18n"`);
    });
  });

  describe("client component transform ('use client')", () => {
    it("uses i18nLookupParse with { parse: true }", () => {
      const output = transform(`
"use client";
import { t } from "@tuja/i18n";
export function Hint() {
  return t({ en: "Click <strong>here</strong>", zh: "点击 <strong>这里</strong>" }, { parse: true });
}
`);
      const key = expectedKey(
        "Click <strong>here</strong>",
        "点击 <strong>这里</strong>",
      );

      expect(output).toContain(`i18nLookupParse(_translations, "${key}")`);
      expect(output).toContain(
        `import { useI18nTranslations, i18nLookupParse } from "@tuja/i18n/client-runtime"`,
      );
      expect(output).not.toContain(`from "@tuja/i18n"`);
    });

    it("passes the caller's translations into a helper as its first argument", () => {
      const output = transform(`
"use client";
import { t } from "@tuja/i18n";
function getLabel(kind, ...rest) {
  return kind === "movie" ? t({ en: "Movie", zh: "电影" }) : t({ en: "Show", zh: "剧集" });
}
export function Badge({ kind, open }) {
  return <span aria-label={open ? getLabel(kind) : ""} />;
}
`);

      expect(output).toContain(
        "function getLabel(_translations, kind, ...rest)",
      );
      expect(output).toContain(
        `i18nLookup(_translations, "${expectedKey("Movie", "电影")}")`,
      );
      expect(output).toContain("const _translations2 = useI18nTranslations();");
      expect(output).toContain("getLabel(_translations2, kind)");
    });

    it("rejects t() at module scope", () => {
      expect(() =>
        transform(`
"use client";
import { t } from "@tuja/i18n";
export const label = t({ en: "Hello", zh: "你好" });
`),
      ).toThrow(/t\(\) at module scope/);
    });

    it("rejects a helper with t() that is called outside render", () => {
      expect(() =>
        transform(`
"use client";
import { t } from "@tuja/i18n";
function getLabel() { return t({ en: "Hello", zh: "你好" }); }
export function Label() {
  return <button onClick={() => alert(getLabel())} />;
}
function format() { return getLabel(); }
`),
      ).toThrow(
        /getLabel calls t\(\), so only a component or a hook can call it/,
      );
    });
  });

  describe("multiple t() calls", () => {
    it("generates one import statement with all needed functions", () => {
      const input = `
import { t } from "@tuja/i18n";
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
  });

  describe("hook-only modules (no directive needed)", () => {
    it("treats a hook-only module as client, even with no directive", () => {
      const input = `
import { t } from "@tuja/i18n";
export function useMovies() { return t({ en: "A", zh: "甲" }); }
`;
      const output = transform(input);
      const key = expectedKey("A", "甲");

      expect(output).toContain(`i18nLookup(_translations, "${key}")`);
      expect(output).toContain(
        `import { useI18nTranslations, i18nLookup } from "@tuja/i18n/client-runtime"`,
      );
    });

    it("falls back to server runtime when a non-hook value export sits beside a hook", () => {
      const input = `
import { t } from "@tuja/i18n";
export function useFoo() { return t({ en: "A", zh: "甲" }); }
export const helper = 1;
`;
      const output = transform(input);
      const key = expectedKey("A", "甲");

      expect(output).toContain(`__i18n_lookup("${key}")`);
      expect(output).toContain(
        `import { __i18n_lookup } from "#src/i18n/server-runtime.ts"`,
      );
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
import { t } from "@tuja/i18n";
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
      expect(output).toContain("@tuja/i18n/client-translations-provider");
      expect(output).toContain(
        "#src/_generated/i18n/client-loaders/movie-database-list-page.ts",
      );
    });

    it("auto-injects setLocale for page files with t() calls", () => {
      const input = `
import { t } from "@tuja/i18n";
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
      expect(output).toContain("@tuja/i18n/server-locale");
      expect(output).toContain("@tuja/i18n/validate-locale");
      // Function should be made async
      expect(output).toMatch(/async function Page/);
      // Should have params extraction
      expect(output).toContain("await");
      expect(output).toContain(".params");
    });

    it("auto-injects setLocale into generateMetadata in layout files", () => {
      const input = `
import { t } from "@tuja/i18n";
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

    it("injects setLocale into a layout default export with t() calls", () => {
      // Next renders a layout and the root layout as concurrent tasks, so a
      // layout that reads the locale before the root layout sets it renders
      // English on a /zh route.
      const input = `
import { t } from "@tuja/i18n";
export default function Layout({ children }) {
  return <Article description={t({ en: "Hello", zh: "你好" })}>{children}</Article>;
}
`;
      const filename = path.join(
        fakeRoot,
        "src/app/[locale]/design-system/components/switch/layout.tsx",
      );
      const output = transformWithManifest(input, filename);

      expect(output).toMatch(
        /async function Layout\(__props\) \{\s*const __params = await __props\.params;\s*__setLocale\(__validateLocale\(__params\.locale\)\);\s*const \{\s*children\s*\} = __props;/,
      );
    });

    it("injects setLocale into a manifest-wrapped page even without direct t() calls", () => {
      // A page that only renders client t() children still produces
      // locale-dependent output via the injected ClientTranslationsProvider,
      // whose getClientTranslations() resolves the bundle by getLocale(). If
      // the page never reads params, Next.js SSG can dedupe the per-locale
      // renders and serve one locale's bundle on the other's route (English
      // on /zh). Reading params + calling setLocale keeps them distinct.
      const input = `
export default function Page() {
  return <ClientChild />;
}
`;
      const filename = path.join(
        fakeRoot,
        "src/app/[locale]/movie-database/(list)/page.tsx",
      );
      const output = transformWithManifest(input, filename);

      expect(output).toContain("__I18nProvider");
      expect(output).toContain("__setLocale");
      expect(output).toContain("__validateLocale");
      expect(output).toMatch(/async function Page/);
      expect(output).toContain(".params");
    });

    it("re-reads the manifest per file so a long-lived instance picks up codegen re-runs", () => {
      // In dev, the plugin is constructed once and reused for every compiled
      // file. If it captured the manifest only at construction, a route
      // renamed/added after startup would be compiled against a stale
      // page→bundle mapping — no ClientTranslationsProvider gets injected and
      // client t() calls throw "Missing translation key" until `.next` is
      // wiped. Reading the manifest per file (guarded by an mtime cache) keeps
      // a single instance current without a restart.
      const reuseManifestPath = path.join(
        os.tmpdir(),
        `i18n-babel-plugin-reuse-manifest-${String(process.pid)}.json`,
      );
      const filename = path.join(
        fakeRoot,
        "src/app/[locale]/movie-database/(list)/page.tsx",
      );
      const input = `
import { t } from "@tuja/i18n";
export default function Page() {
  return <div>{t({ en: "Hello", zh: "你好" })}</div>;
}
`;

      // v1: the page is not yet in the manifest (e.g. codegen has not caught
      // up to a just-created route). Force an old mtime so the second write is
      // unambiguously newer even on coarse-resolution filesystems.
      fs.writeFileSync(reuseManifestPath, JSON.stringify({}));
      fs.utimesSync(reuseManifestPath, new Date(1000), new Date(1000));

      // Construct the plugin ONCE and reuse the instance across transforms,
      // exactly as a dev server does.
      const pluginInstance = require(pluginPath)(
        { types },
        { manifestPath: reuseManifestPath, rootDir: fakeRoot },
      );
      const runWithInstance = () => {
        const result = transformSync(input, {
          filename,
          parserOpts: { plugins: ["typescript", "jsx"] },
          plugins: [pluginInstance],
          configFile: false,
          babelrc: false,
        });
        if (!result || result.code == null) {
          throw new Error("Transform returned no code");
        }
        return result.code;
      };

      expect(runWithInstance()).not.toContain("__I18nProvider");

      // v2: codegen adds the route to the manifest with a newer mtime.
      fs.writeFileSync(
        reuseManifestPath,
        JSON.stringify({
          "src/app/[locale]/movie-database/(list)/page.tsx":
            "movie-database-list-page",
        }),
      );
      fs.utimesSync(reuseManifestPath, new Date(5000), new Date(5000));

      // The same instance must now inject the provider for the freshly mapped
      // page — no reconstruction required.
      expect(runWithInstance()).toContain("__I18nProvider");

      fs.rmSync(reuseManifestPath, { force: true });
    });
  });
});
