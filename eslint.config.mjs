import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import stylexjs from "@stylexjs/eslint-plugin";
import importPlugin from "eslint-plugin-import";
import reactPlugin from "eslint-plugin-react";
import reactCompiler from "eslint-plugin-react-compiler";
import reactHooksPlugin from "eslint-plugin-react-hooks";
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
      "tooling/**/*",
      "src/_generated/**/*",
      ".next/**/*",
      "next-env.d.ts",
      "public/sw.js",
    ],
  },
  js.configs.recommended,
  ...tsEslint.configs.recommendedTypeChecked,
  {
    plugins: {
      "@next/next": nextPlugin,
      import: importPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "@stylexjs": stylexjs,
      "react-compiler": reactCompiler,
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
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
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
      "import/order": [
        "error",
        {
          pathGroups: [
            {
              pattern: "@/**/*",
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
      "react-compiler/react-compiler": "error",
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
]);
