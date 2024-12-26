import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import stylexjs from "@stylexjs/eslint-plugin";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactCompiler from "eslint-plugin-react-compiler";
import path from "node:path";
import { fileURLToPath } from "node:url";
import next from "eslint-config-next";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["next.config.js", "public/sw.js"],
  },
  ...fixupConfigRules(
    compat.extends(
      "eslint:recommended",
      "next/core-web-vitals",
      "plugin:@typescript-eslint/strict",
      "plugin:import/recommended",
      "plugin:import/typescript"
    )
  ),
  {
    plugins: {
      next,
      "@typescript-eslint": fixupPluginRules(typescriptEslint),
      "@stylexjs": stylexjs,
      "react-compiler": reactCompiler,
    },

    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "script",

      parserOptions: {
        project: ["./tsconfig.json"],
      },
    },

    rules: {
      "@stylexjs/valid-styles": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/consistent-type-exports": "error",
      "import/order": "error",
      "one-var": ["error", "never"],
      "react-compiler/react-compiler": "error",
    },
  },
];
