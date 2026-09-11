import comments from "@eslint-community/eslint-plugin-eslint-comments";
import eslintReact from "@eslint-react/eslint-plugin";
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import stylexjs from "@stylexjs/eslint-plugin";
import turboConfig from "eslint-config-turbo/flat";
import importPlugin from "eslint-plugin-import-x";
import reactHooks from "eslint-plugin-react-hooks";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import { defineConfig } from "eslint/config";
import { createRequire } from "node:module";
import tsEslint from "typescript-eslint";

const require = createRequire(import.meta.url);
const tujaPlugin = require("@tuja/eslint-plugin");

const anchorNameLimit = {
  limit: "string",
  reason: "An anchor name is a dashed ident, e.g. `--name`.",
};

export default defineConfig([
  {
    ignores: [
      "apps/*/babel.config.js",
      "eslint.config.mjs",
      "apps/*/next.config.js",
      "apps/*/postcss.config.js",
      "apps/*/src/_generated/**/*",
      "packages/*/src/_generated/**/*",
      "apps/web/src/vendor/**/*",
      "apps/*/.next/**/*",
      "apps/*/next-env.d.ts",
      "apps/*/public/sw.js",
      "apps/web/playwright-report/**/*",
      ".claude/**/*",
      "**/node_modules/**/*",
    ],
  },
  reactHooks.configs.flat["recommended-latest"],
  js.configs.recommended,
  ...tsEslint.configs.strictTypeChecked,
  eslintReact.configs["recommended-typescript"],
  ...turboConfig,
  {
    plugins: {
      "import-x": importPlugin,
      "@stylexjs": stylexjs,
      unicorn: eslintPluginUnicorn,
      "@tuja": tujaPlugin,
      "@eslint-community/eslint-comments": comments,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      "@stylexjs/valid-styles": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/consistent-type-exports": "error",
      "import-x/order": [
        "error",
        {
          pathGroups: [
            {
              pattern: "#src/**/*",
              group: "parent",
              position: "before",
            },
          ],
          alphabetize: {
            order: "asc",
            orderImportKind: "asc",
            caseInsensitive: true,
          },
        },
      ],
      "one-var": ["error", "never"],
      "no-restricted-syntax": [
        "error",
        {
          // Only catches the `opacity: { ":disabled": … }` shape. A bare
          // `opacity: 0.3` can't be restricted without flagging the shimmer and
          // spinner fades, which are not this token.
          selector:
            'Property[key.name="opacity"] > ObjectExpression > Property[key.value=":disabled"] > Literal[value=type(number)]',
          message:
            "Use `opacity.disabled` from tokens.stylex. Hand-picked disabled fades drifted to five different values before it existed.",
        },
        {
          // Carve-outs: `as const`, and assertions directly on JSON parsing
          // (`JSON.parse(x) as T`, `res.json() as T`, `(await res.json()) as
          // T`) — the untyped-data trust boundary where the type system has
          // nothing to offer without runtime validation.
          selector:
            'TSAsExpression:not([typeAnnotation.typeName.name="const"]):not([expression.callee.object.name="JSON"][expression.callee.property.name="parse"]):not([expression.callee.property.name="json"]):not([expression.argument.callee.property.name="json"])',
          message:
            "Type assertions hide real type errors. Prefer `satisfies`, a type guard, or schema validation. (`as const` and JSON-parse results are allowed.)",
        },
        {
          selector: "TSTypeAssertion",
          message:
            "Angle-bracket type assertions are banned for the same reason as `as`.",
        },
      ],
      // Inline disables are the sanctioned escape hatch for genuinely
      // unavoidable violations: name the rule and state a reason after `--`.
      "@eslint-community/eslint-comments/no-use": [
        "error",
        {
          allow: [
            "eslint-disable",
            "eslint-disable-next-line",
            "eslint-enable",
          ],
        },
      ],
      "@eslint-community/eslint-comments/no-unlimited-disable": "error",
      "@eslint-community/eslint-comments/require-description": "error",
      "@eslint-community/eslint-comments/disable-enable-pair": [
        "error",
        { allowWholeFile: true },
      ],
      "@typescript-eslint/no-inferrable-types": "error",
      "@eslint-react/set-state-in-effect": "off",
      // Positional lists (frames, cells, code lines) are common here and the
      // index IS the identity — the rule flagged only correct uses.
      "@eslint-react/no-array-index-key": "off",
      "unicorn/no-unused-properties": "error",
      "@tuja/no-t-outside-render": "error",
      "@tuja/no-banned-copy-words": "error",
      "@tuja/no-single-use-literal-alias": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  // Design-system conventions that only the @tuja/ui source has to keep.
  // The app consumes the same radius tokens, which carry the no-corner-shape
  // fallback, so an unpaired radius there drifts by browser too.
  {
    files: ["packages/ui/src/**/*.{ts,tsx}", "apps/web/src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", "**/test-setup.ts"],
    rules: {
      "@tuja/require-corner-shape": "error",
    },
  },
  {
    files: ["packages/ui/src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", "**/test-setup.ts"],
    rules: {
      "@tuja/require-package-export": "error",
    },
  },
  // StyleX 0.19 types these properties but its eslint allowlist does not
  // carry them yet. `propLimits` puts them back for the one package that uses
  // them, so a stray one elsewhere still errors.
  {
    files: ["packages/ui/src/**/*.{ts,tsx}"],
    rules: {
      "@stylexjs/valid-styles": [
        "error",
        {
          propLimits: {
            anchorName: anchorNameLimit,
            positionAnchor: anchorNameLimit,
            WebkitMaskComposite: {
              limit: "string",
              reason:
                "Safari reads only the vendor-prefixed mask-composite, and its keyword set (e.g. `xor`) differs from the standard property's.",
            },
            WebkitMaskClip: {
              limit: "string",
              reason:
                "Safari reads only the vendor-prefixed mask longhands, so the clip ships prefixed beside its mask-image.",
            },
          },
        },
      ],
    },
  },
  {
    files: ["packages/ui/src/**/*.stylex.ts", "apps/web/src/**/*.stylex.ts"],
    rules: {
      "@tuja/only-stylex-exports": "error",
    },
  },
  // Next.js rules apply only to the Next.js apps.
  {
    files: ["apps/*/**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // Raw <img> is a deliberate pattern here (TMDB CDN images, data-URI
      // specimens, tiny logos) alongside next/image for static assets — the
      // rule flagged only intentional uses.
      "@next/next/no-img-element": "off",
    },
  },
  // Test files may call t() outside render scope for unit testing purposes.
  {
    files: ["**/*.test.{ts,tsx,js,mjs}", "**/*.spec.{ts,tsx,js,mjs}"],
    rules: {
      "@tuja/no-t-outside-render": "off",
    },
  },
  // shadcn/ui generates these files and keeps its own convention.
  {
    files: ["apps/trip-planner/src/components/ui/**"],
    rules: {
      "@tuja/no-single-use-literal-alias": "off",
    },
  },
  // A hook can only run inside a client component, so a module that exports
  // only hooks is never a server/client seam and `"use client"` there is dead.
  {
    files: ["apps/*/src/**/*.{ts,tsx}", "packages/*/src/**/*.{ts,tsx}"],
    rules: {
      "@tuja/no-use-client-in-hooks": "error",
    },
  },
  // A source file is named after the thing it exports, in kebab-case.
  {
    files: [
      "apps/*/src/**/*.{ts,tsx,js,mjs}",
      "packages/*/src/**/*.{ts,tsx,js,mjs}",
      "scripts/**/*.mjs",
    ],
    ignores: [
      // Barrels re-export other files and have no name of their own.
      "**/index.{ts,tsx,js,mjs}",
      // StyleX needs the suffix; the export is the token set, not the file.
      "**/*.stylex.ts",
      // Test and eval infrastructure is named after what it covers.
      "**/*.{test,spec}.{ts,tsx,mjs}",
      "**/*.eval.ts",
      "**/test-*.ts",
      "**/test-stubs/**",
      // Declaration and config files are named by the tool that reads them.
      "**/*.d.ts",
      "**/*.config.*",
      // Next.js reserves these file names for its own routing conventions.
      "apps/*/src/app/**/{page,layout,route,loading,error,global-error,not-found,template,default}.{ts,tsx,js,jsx}",
      "apps/*/src/app/**/{sitemap,robots,manifest,opengraph-image,twitter-image,icon,apple-icon}.{ts,tsx,js,jsx}",
      "apps/*/src/{middleware,proxy,instrumentation,instrumentation-client}.ts",
      "apps/*/src/sw.ts",
      // A showcase's operable specimens sit beside it, named after the
      // showcase they serve: the file holds several, so none of them names it.
      "apps/web/src/components/design-system/sections/**/*-specimens.tsx",
      // shadcn/ui generates these files and keeps its own convention.
      "apps/trip-planner/src/components/ui/**",
      // A constant-only bag is named for its category.
      "**/constants.ts",
    ],
    rules: {
      "@tuja/export-matches-filename": "error",
      "unicorn/filename-case": ["error", { case: "kebabCase" }],
    },
  },
  // Tooling JS files are CJS and not covered by tsconfig, so disable
  // type-checked rules and configure for Node.js/CommonJS.
  {
    files: ["packages/**/*.js"],
    ignores: ["packages/tmdb-codegen/src/generator.js"],
    ...tsEslint.configs.disableTypeChecked,
    languageOptions: {
      sourceType: "commonjs",
      parserOptions: { projectService: false },
      globals: {
        __dirname: "readonly",
        __filename: "readonly",
        console: "readonly",
        module: "readonly",
        require: "readonly",
        process: "readonly",
      },
    },
    rules: {
      ...tsEslint.configs.disableTypeChecked.rules,
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Tooling ESM files — disable type-checked rules and add Node globals.
  {
    files: [
      "packages/**/*.mjs",
      "scripts/**/*.mjs",
      "apps/*/e2e/**/*.mjs",
      "packages/tmdb-codegen/src/generator.js",
    ],
    ...tsEslint.configs.disableTypeChecked,
    languageOptions: {
      parserOptions: { projectService: false },
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
  },
]);
