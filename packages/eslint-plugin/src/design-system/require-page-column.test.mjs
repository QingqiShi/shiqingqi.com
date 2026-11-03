import { createRequire } from "node:module";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);
const rule = require("./require-page-column");

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: "latest", sourceType: "module" },
});

const importTokens = `import { pageColumnTokens } from "@tuja/ui/primitives/page-column.stylex";`;

ruleTester.run("require-page-column", rule, {
  valid: [
    {
      code: `${importTokens} const styles = stylex.create({ page: { maxInlineSize: pageColumnTokens.inlineSize } });`,
    },
  ],

  invalid: [
    {
      code: `${importTokens} const styles = stylex.create({ view: { [pageColumnTokens.inlineSize]: "54.5rem" } });`,
      errors: [{ messageId: "columnWidth" }],
    },
  ],
});
