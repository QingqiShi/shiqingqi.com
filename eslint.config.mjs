import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import stylexjs from "@stylexjs/eslint-plugin";
import reactCompiler from "eslint-plugin-react-compiler";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tsEslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = tsEslint.config([
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  js.configs.recommended,
  tsEslint.configs.recommendedTypeChecked,
  {
    name: "custom",
    plugins: {
      "@stylexjs": stylexjs,
      "react-compiler": reactCompiler,
    },
    ignores: ["eslint.config.mjs"],
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
      "import/order": "error",
      "one-var": ["error", "never"],
      "react-compiler/react-compiler": "error",
    },
  },
]);

export default eslintConfig;
