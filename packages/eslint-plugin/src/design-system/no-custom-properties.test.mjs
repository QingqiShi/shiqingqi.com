import { createRequire } from "node:module";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);
const rule = require("./no-custom-properties");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const allowLyteNyte = [
  {
    allow: [{ pattern: "^--ln-", reason: "LyteNyte Grid reads these names." }],
  },
];

ruleTester.run("no-custom-properties", rule, {
  valid: [
    {
      code: `const styles = stylex.create({ root: { [vars.gap]: "1px", gap: vars.gap } });`,
    },
    // A command-line flag is not CSS.
    { code: `run(["git", "add", "--stage"]);` },
    // An anchor name is a dashed ident, not a custom property.
    {
      code: `const styles = stylex.create({ root: { anchorName: "--segment-selected" } });`,
    },
    {
      code: `const styles = stylex.create({ grid: { "--ln-text": color.fg } });`,
      options: allowLyteNyte,
    },
  ],

  invalid: [
    {
      code: `const styles = stylex.create({ root: { "--gap": "1px" } });`,
      errors: [{ messageId: "customProperty", data: { name: "--gap" } }],
    },
    {
      code: `const el = <div style={{ "--accent": color }} />;`,
      errors: [{ messageId: "customProperty", data: { name: "--accent" } }],
    },
    {
      code: `const styles = stylex.create({ root: { inlineSize: "var(--fill, 0%)" } });`,
      errors: [{ messageId: "customProperty", data: { name: "--fill" } }],
    },
    {
      code: "const styles = stylex.create({ root: { color: `var(--accent, ${color.fg})` } });",
      errors: [{ messageId: "customProperty", data: { name: "--accent" } }],
    },
    {
      code: `const el = <stop stopColor="var(--hue)" />;`,
      errors: [{ messageId: "customProperty", data: { name: "--hue" } }],
    },
    {
      code: `const NAME = "--stage-top"; el.style.setProperty(NAME, "1px");`,
      errors: [{ messageId: "customProperty", data: { name: "--stage-top" } }],
    },
    {
      code: `getComputedStyle(el).getPropertyValue("--stage-top");`,
      errors: [{ messageId: "customProperty", data: { name: "--stage-top" } }],
    },
    {
      code: 'const NAME = "--stage-top"; const top = `calc(var(${NAME}, 0px) + 1px)`;',
      errors: [{ messageId: "customProperty", data: { name: "--stage-top" } }],
    },
    {
      code: "const styles = stylex.create({ root: { transition: { default: `--wash ${duration}` } } });",
      errors: [{ messageId: "namedInTransition", data: { name: "--wash" } }],
    },
    // The allow list covers only the names it matches.
    {
      code: `const styles = stylex.create({ grid: { "--ln-text": "red", "--grid-gap": "1px" } });`,
      options: allowLyteNyte,
      errors: [{ messageId: "customProperty", data: { name: "--grid-gap" } }],
    },
  ],
});
