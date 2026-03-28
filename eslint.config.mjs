import eslintReact from "@eslint-react/eslint-plugin";
import js from "@eslint/js";
import stylexjs from "@stylexjs/eslint-plugin";
import nextConfig from "eslint-config-next";
import importPlugin from "eslint-plugin-import-x";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import { defineConfig } from "eslint/config";
import tsEslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: [
      ".babelrc.js",
      "eslint.config.mjs",
      "next.config.js",
      "postcss.config.js",
      "src/_generated/**/*",
      ".next/**/*",
      "next-env.d.ts",
      "public/sw.js",
      "playwright-report/**/*",
    ],
  },
  ...nextConfig,
  js.configs.recommended,
  ...tsEslint.configs.recommendedTypeChecked,
  eslintReact.configs["recommended-typescript"],
  eslintReact.configs["disable-conflict-eslint-plugin-react"],
  eslintReact.configs["disable-conflict-eslint-plugin-react-hooks"],
  {
    plugins: {
      "import-x": importPlugin,
      "@stylexjs": stylexjs,
      unicorn: eslintPluginUnicorn,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // --- eslint-plugin-react → @eslint-react/eslint-plugin ---
      // eslint-plugin-react (via eslint-config-next) crashes on ESLint 10.
      "react/display-name": "off",
      "react/jsx-key": "off",
      "react/jsx-no-comment-textnodes": "off",
      "react/jsx-no-duplicate-props": "off",
      "react/jsx-no-undef": "off",
      "react/jsx-uses-react": "off",
      "react/jsx-uses-vars": "off",
      "react/no-children-prop": "off",
      "react/no-danger-with-children": "off",
      "react/no-deprecated": "off",
      "react/no-direct-mutation-state": "off",
      "react/no-find-dom-node": "off",
      "react/no-is-mounted": "off",
      "react/no-render-return-value": "off",
      "react/no-string-refs": "off",
      "react/no-unescaped-entities": "off",
      "react/require-render-return": "off",
      // --- end eslint-plugin-react → @eslint-react/eslint-plugin ---
      "@stylexjs/valid-styles": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            arguments: false,
            attributes: false,
          },
        },
      ],
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
      "@eslint-react/set-state-in-effect": "off",
      "unicorn/no-unused-properties": "error",
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
  // Tooling JS files are CJS and not covered by tsconfig, so disable
  // type-checked rules and configure for Node.js/CommonJS.
  {
    files: ["tooling/**/*.js"],
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
  // Tooling MJS files (ESM) — disable type-checked rules only.
  {
    files: ["tooling/**/*.mjs"],
    ...tsEslint.configs.disableTypeChecked,
    languageOptions: {
      parserOptions: { projectService: false },
    },
  },
]);
