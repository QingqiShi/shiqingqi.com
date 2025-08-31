import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import stylexjs from "@stylexjs/eslint-plugin";
import reactCompiler from "eslint-plugin-react-compiler";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tsEslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = tsEslint.config([
  ...compat.extends("next/core-web-vitals"),
  js.configs.recommended,
  tsEslint.configs.recommendedTypeChecked,
  {
    name: "custom",
    plugins: {
      "@stylexjs": stylexjs,
      "react-compiler": reactCompiler,
      unicorn: eslintPluginUnicorn,
    },
    ignores: [
      ".babelrc.js",
      "eslint.config.mjs",
      "next.config.js",
      "postcss.config.js",
      "tooling/**/*",
      "src/_generated/**/*",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
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

export default eslintConfig;
