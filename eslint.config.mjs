import comments from "@eslint-community/eslint-plugin-eslint-comments";
import eslintReact from "@eslint-react/eslint-plugin";
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import turboConfig from "eslint-config-turbo/flat";
import importPlugin from "eslint-plugin-import-x";
import reactHooks from "eslint-plugin-react-hooks";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import { defineConfig } from "eslint/config";
import { builtinRules } from "eslint/use-at-your-own-risk";
import { createRequire } from "node:module";
import tsEslint from "typescript-eslint";

const require = createRequire(import.meta.url);
const tujaPlugin = require("@tuja/eslint-plugin");

const anchorNameLimit = {
  limit: "string",
  reason: "An anchor name is a dashed ident, e.g. `--name`.",
};

// A ban with a narrower scope than the base config is a copy of
// `no-restricted-syntax` under its own name. Flat config does not merge the
// options of one rule from two config objects, so one shared rule needs an
// object for each mix of scopes.
const noRestrictedSyntax = builtinRules.get("no-restricted-syntax");
const restrictedPlugin = {
  rules: {
    "stylex-babel-plugin": noRestrictedSyntax,
    "tmdb-query-fn": noRestrictedSyntax,
    "reduced-motion": noRestrictedSyntax,
    "type-assertion": noRestrictedSyntax,
  },
};

const noUnusedVarsOptions = {
  args: "all",
  argsIgnorePattern: "^_",
  caughtErrors: "all",
  caughtErrorsIgnorePattern: "^_",
  destructuredArrayIgnorePattern: "^_",
  varsIgnorePattern: "^_",
  ignoreRestSiblings: true,
};

const stylexPluginsMessage =
  "Take the StyleX Babel plugins from `stylexPlugins()` in `@tuja/babel-plugins/stylex-plugins`, so every build runs the breakpoints plugin first and the shared options.";

export default defineConfig([
  {
    ignores: [
      "apps/*/babel.config.js",
      "eslint.config.mjs",
      "apps/*/next.config.js",
      "apps/*/postcss.config.js",
      "apps/*/src/_generated/**/*",
      "packages/*/src/_generated/**/*",
      "packages/system-palette-codegen/src/vendor/**/*",
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
      unicorn: eslintPluginUnicorn,
      "@tuja": tujaPlugin,
      restricted: restrictedPlugin,
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
      noInlineConfig: true,
    },
    rules: {
      // This rule replaces @stylexjs/valid-styles. Its doc header gives the
      // reason.
      "@tuja/valid-styles": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/consistent-type-exports": "error",
      "import-x/no-relative-packages": "error",
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
          selector:
            'CallExpression[callee.object.name="vi"][callee.property.name=/^(mock|doMock)$/][arguments.0.value="server-only"]',
          message:
            "Vitest aliases `server-only` to a stub, so a mock of it does nothing.",
        },
        {
          selector: 'CallExpression[callee.property.name="prefetch"]',
          message:
            "Nothing prefetches a route: a screen loads when the visitor opens it.",
        },
        {
          selector:
            'ImportDeclaration[source.value="react"] > ImportSpecifier[imported.name=/^(useMemo|useCallback|memo)$/], MemberExpression[object.name="React"][property.name=/^(useMemo|useCallback|memo)$/]',
          message:
            "React Compiler memoizes components and hooks. Remove the manual `useMemo`, `useCallback`, or `memo`.",
        },
        {
          // `render` with JSX catches a class that does not extend a React
          // class, and a base class that the name match misses.
          selector:
            ':matches(ClassDeclaration, ClassExpression):matches([superClass.name=/^(Pure)?Component$/], [superClass.property.name=/^(Pure)?Component$/], :has(MethodDefinition[key.name="render"] :matches(JSXElement, JSXFragment)))',
          message:
            "Write a function component and use hooks. A class component is not allowed. A React error boundary needs a class, so scope it in this config with a reason.",
        },
      ],
      "restricted/type-assertion": [
        "error",
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
      "restricted/stylex-babel-plugin": [
        "error",
        {
          selector:
            ':not(ImportDeclaration) > Literal[value="@stylexjs/babel-plugin"]',
          message: stylexPluginsMessage,
        },
        {
          selector:
            'ImportDeclaration[source.value="@stylexjs/babel-plugin"]:not([importKind="type"])',
          message: stylexPluginsMessage,
        },
      ],
      // `noInlineConfig` makes a directive comment do nothing. This rule
      // reports the comment, so it does not stay in the code. If a rule is
      // wrong for a file, change the rule or its scope in this config.
      "@eslint-community/eslint-comments/no-use": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": true, "ts-ignore": true, "ts-nocheck": true },
      ],
      "@typescript-eslint/no-inferrable-types": "error",
      // The build runs React Compiler with `panicThreshold: "all_errors"`, so
      // code it cannot compile fails the build. These rules report most of
      // that code in the editor. This plugin has a newer copy of the
      // compiler, so the build can fail on code that these rules accept.
      "react-hooks/todo": "error",
      "react-hooks/unsupported-syntax": "error",
      "react-hooks/syntax": "error",
      "react-hooks/invariant": "error",
      "@eslint-react/set-state-in-effect": "off",
      // Positional lists (frames, cells, code lines) are common here and the
      // index IS the identity — the rule flagged only correct uses.
      "@eslint-react/no-array-index-key": "off",
      "unicorn/no-unused-properties": "error",
      "@tuja/no-t-outside-render": "error",
      "@tuja/no-banned-copy-words": "error",
      "@tuja/no-single-use-literal-alias": "error",
      // @tuja/no-unnecessary-use-prefix replaces this rule. Its doc header
      // gives the reason.
      "@eslint-react/no-unnecessary-use-prefix": "off",
      "@tuja/no-unnecessary-use-prefix": "error",
      "@typescript-eslint/no-unused-vars": ["error", noUnusedVarsOptions],
    },
  },
  // A `declare module "react"` augmentation must use the same type parameter
  // names as the React declaration (TS2428). Thus `T` stays unused.
  {
    files: ["apps/web/src/babel.d.ts", "packages/ui/src/css-prop.d.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ...noUnusedVarsOptions, varsIgnorePattern: "^(_|T$)" },
      ],
    },
  },
  // A Lab lets the visitor pair props that the component's types forbid.
  // Thus the Specimen's props do not have the component's prop type.
  {
    files: ["apps/web/src/design-system/lab/render-specimen.ts"],
    rules: {
      "restricted/type-assertion": "off",
    },
  },
  // `document.execCommand("copy")` is deprecated, but it is the only copy
  // method in a non-secure context (HTTP on a LAN address, some webviews).
  {
    files: ["apps/web/src/browser/copy-text-to-clipboard.ts"],
    rules: {
      "@typescript-eslint/no-deprecated": [
        "error",
        { allow: [{ from: "lib", name: "execCommand" }] },
      ],
    },
  },
  {
    files: ["packages/babel-plugins/**"],
    rules: {
      "restricted/stylex-babel-plugin": "off",
    },
  },
  {
    files: ["apps/web/src/**"],
    ignores: [
      "apps/web/src/movie-database/tmdb/queries/**",
      "apps/web/src/finance/queries/**",
    ],
    rules: {
      "restricted/tmdb-query-fn": [
        "error",
        {
          selector:
            'ObjectExpression > Property:matches([key.name="queryFn"], [key.value="queryFn"])',
          message:
            "Define a TMDB query's `queryFn` in `#src/movie-database/tmdb/queries/`, so each query has one params-to-call mapping for client and server.",
        },
      ],
    },
  },
  {
    files: ["apps/web/src/**", "packages/ui/src/**"],
    ignores: [
      "**/*.{test,spec}.{ts,tsx}",
      "apps/web/src/testing/**",
      "packages/ui/src/test-setup.ts",
      "packages/ui/src/test-support/**",
    ],
    rules: {
      "restricted/reduced-motion": [
        "error",
        {
          selector:
            'CallExpression:matches([callee.name="matchMedia"], [callee.property.name="matchMedia"]) :matches(Literal[value=/prefers-reduced-motion/], TemplateElement[value.raw=/prefers-reduced-motion/])',
          message:
            "Read reduced motion through `useReducedMotion()` from `@tuja/ui/motion/use-reduced-motion`, or through `prefersReducedMotion()` from `@tuja/ui/motion/prefers-reduced-motion` inside an effect.",
        },
        {
          selector:
            ":not(CallExpression) > Literal[value=/^\\(prefers-reduced-motion\\s*[:)]/]",
          message:
            "Use `REDUCED_MOTION_QUERY` from `@tuja/ui/motion/prefers-reduced-motion`. It comes from the StyleX const, so the script side and the style side cannot drift.",
        },
        {
          selector:
            'UnaryExpression[operator="typeof"]:matches([argument.name="matchMedia"], [argument.property.name="matchMedia"])',
          message:
            "Every supported browser has `matchMedia`, and the jsdom test setup installs one. Do not guard it.",
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
  // A line of prose takes its length from the Measure. The tokens define it.
  {
    files: ["apps/*/src/**/*.{ts,tsx}", "packages/ui/src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", "packages/ui/src/tokens.stylex.ts"],
    rules: {
      "@tuja/require-measure": "error",
    },
  },
  // Content sits in the page column, with the page gutter. Only @tuja/ui
  // builds them from the cap and the safe area.
  {
    files: ["apps/*/src/**/*.{ts,tsx}"],
    ignores: [
      "**/*.test.{ts,tsx}",
      // The playground canvas covers the full screen. It extends past the
      // safe area and does not set a gutter.
      "apps/web/src/playground/full-screen-canvas.stylex.ts",
    ],
    rules: {
      "@tuja/require-page-column": "error",
    },
  },
  // An icon takes its size and colour from its parent, and names its weight.
  {
    files: ["apps/*/src/**/*.tsx", "packages/ui/src/**/*.tsx"],
    ignores: ["**/*.test.tsx"],
    rules: {
      "@tuja/require-icon-sizing": "error",
    },
  },
  {
    files: ["packages/ui/src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", "**/test-setup.ts"],
    rules: {
      "@tuja/require-package-export": "error",
    },
  },
  // A tap on a touch screen leaves `:hover` matching until the next tap
  // elsewhere, so a hover style applies only where a pointer can hover.
  {
    files: ["apps/*/src/**/*.{ts,tsx}", "packages/ui/src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", "**/test-setup.ts"],
    rules: {
      "@tuja/require-hover-media": "error",
    },
  },
  // A gap between siblings names its relationship. The primitives and the
  // tokens define the steps, so they are not in scope.
  {
    files: ["apps/*/src/**/*.{ts,tsx}", "packages/ui/src/**/*.{ts,tsx}"],
    ignores: [
      "**/*.test.{ts,tsx}",
      "packages/ui/src/primitives/**",
      "packages/ui/src/tokens.stylex.ts",
      // These specimens draw a page at thumbnail scale. Their gaps are drawn
      // sizes, not relationships.
      "apps/web/src/design-system/specimens/{header-footer-layout,sidebar-layout,progressive-blur,sticky-controls,movie-detail,scroll-mask}-specimen.tsx",
      // The effect test benches set physics distances: the reach of a fan, or
      // the strip of page that a test reads for dust.
      "apps/web/src/design-system/sections/effect-layer/*-test-bench.tsx",
    ],
    rules: {
      "@tuja/require-rhythm-spacing": [
        "error",
        { gapTokenGroups: ["gridlineTokens"] },
      ],
    },
  },
  // Lines of text in one item take no gap, because their line height spaces
  // them.
  {
    files: ["apps/*/src/**/*.tsx", "packages/ui/src/**/*.tsx"],
    ignores: ["**/*.test.tsx"],
    rules: {
      "@tuja/require-text-stack": "error",
    },
  },
  // Text takes its size from a type role. The primitives and the tokens define
  // the roles, so they are not in scope.
  {
    files: ["apps/*/src/**/*.{ts,tsx}", "packages/ui/src/**/*.{ts,tsx}"],
    ignores: [
      "**/*.test.{ts,tsx}",
      "packages/ui/src/primitives/**",
      "packages/ui/src/tokens.stylex.ts",
      // These drawings and specimens set type at a drawn size: a page at
      // thumbnail scale, a poster title as artwork, one glyph of a family, or
      // each step of a fluid scale side by side.
      "apps/web/src/design-system/foundation-illustrations/**",
      "apps/web/src/design-system/sections/examples/typeset-poster.tsx",
      "apps/web/src/design-system/sections/foundations/{families-showcase,viewport-scale-specimen,container-scale-specimen}.tsx",
      // The calculator sizes its keys and its readout to its container.
      "apps/web/src/calculator/calculator-{button,display}.tsx",
      // The "don't" specimen of `Text` shows a raw pixel size on purpose.
      "apps/web/src/design-system/sections/components/hard-coded-type.stylex.ts",
    ],
    rules: {
      "@tuja/require-type-role": "error",
    },
  },
  // StyleX 0.19 types these properties but its eslint allowlist does not
  // carry them yet. `propLimits` puts them back for the one package that uses
  // them, so a stray one elsewhere still errors.
  {
    files: ["packages/ui/src/**/*.{ts,tsx}"],
    rules: {
      "@tuja/valid-styles": [
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
  // A Playwright fixture names the fixtures it needs in the pattern of its
  // first parameter. A fixture that needs no fixture has an empty pattern.
  {
    files: ["apps/*/e2e/**/*.ts"],
    rules: {
      "no-empty-pattern": ["error", { allowObjectPatternsAsParameters: true }],
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
  // Every link goes through an app's `Link`, which sets `prefetch={false}`.
  {
    files: ["apps/**", "packages/**"],
    ignores: ["apps/*/src/link.tsx", "apps/web/src/links/link.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/link",
              message:
                "Import `Link` from `#src/links/link.tsx` (`@/link` in trip-planner). It never prefetches.",
            },
          ],
        },
      ],
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
    files: ["apps/trip-planner/src/shadcn/**"],
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
      "apps/*/src/pwa/sw.ts",
      // A showcase's operable specimens sit beside it, named after the
      // showcase they serve: the file holds several, so none of them names it.
      "apps/web/src/design-system/sections/**/*-specimens.tsx",
      // shadcn/ui generates these files and keeps its own convention.
      "apps/trip-planner/src/shadcn/**",
      // A constant-only bag is named for its category.
      "**/constants.ts",
      // The i18n Babel plugin imports these files by path, so their names
      // cannot change to match their exports.
      "apps/web/src/i18n.ts",
      "apps/web/src/i18n/{client-runtime,server-locale,server-runtime}.ts",
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
      "apps/*/babel-plugins.mjs",
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
