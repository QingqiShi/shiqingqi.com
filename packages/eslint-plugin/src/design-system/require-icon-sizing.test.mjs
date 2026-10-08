import { createRequire } from "node:module";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);
// `@typescript-eslint/parser` is only reachable through the `typescript-eslint`
// meta package's own node_modules, so go through its `parser` export.
const tsParser = require("typescript-eslint").parser;
const rule = require("./require-icon-sizing");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

const PLUS = `import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";\n`;

// RuleTester.run registers its own describe/it blocks,
// so call it at the top level (not inside an it() block).
ruleTester.run("require-icon-sizing", rule, {
  valid: [
    // V1: a bare icon with its weight
    { code: `${PLUS}<PlusIcon weight="bold" />;` },
    // V2: other props are the icon's own
    { code: `${PLUS}<PlusIcon weight="fill" mirrored aria-hidden />;` },
    // V3: a spread can carry the weight
    { code: `${PLUS}<PlusIcon {...props} />;` },
    // V4: a component that is not from Phosphor
    {
      code: `import { Avatar } from "@tuja/ui/components/avatar";\n<Avatar size={32} color="red" />;`,
    },
    // V5: an element with the same name but no Phosphor import
    { code: `<PlusIcon size={16} />;` },
    // V6: a type-only import is not a component
    {
      code: `import type { Icon } from "@phosphor-icons/react";\n<Icon size={16} />;`,
      languageOptions: { parser: tsParser },
    },
  ],
  invalid: [
    // I1: a pixel size
    {
      code: `${PLUS}<PlusIcon size={16} weight="bold" />;`,
      errors: [
        { messageId: "parentProp", data: { prop: "size", icon: "PlusIcon" } },
      ],
    },
    // I2: a colour
    {
      code: `${PLUS}<PlusIcon color="currentColor" weight="bold" />;`,
      errors: [
        { messageId: "parentProp", data: { prop: "color", icon: "PlusIcon" } },
      ],
    },
    // I3: no weight
    {
      code: `${PLUS}<PlusIcon aria-hidden />;`,
      errors: [{ messageId: "missingWeight", data: { icon: "PlusIcon" } }],
    },
    // I4: all three at once
    {
      code: `${PLUS}<PlusIcon size="1.5em" color={tint} />;`,
      errors: [
        { messageId: "missingWeight", data: { icon: "PlusIcon" } },
        { messageId: "parentProp", data: { prop: "size", icon: "PlusIcon" } },
        { messageId: "parentProp", data: { prop: "color", icon: "PlusIcon" } },
      ],
    },
    // I5: a spread of compiled styles carries no weight
    {
      code: `${PLUS}<PlusIcon aria-hidden {...stylex.props(styles.icon)} />;`,
      errors: [{ messageId: "missingWeight", data: { icon: "PlusIcon" } }],
    },
    // I6: an aliased import
    {
      code: `import { PlusIcon as Add } from "@phosphor-icons/react/dist/ssr/Plus";\n<Add />;`,
      errors: [{ messageId: "missingWeight", data: { icon: "Add" } }],
    },
    // I7: the package root, through a namespace
    {
      code: `import * as Phosphor from "@phosphor-icons/react";\n<Phosphor.PlusIcon size={20} weight="bold" />;`,
      errors: [
        {
          messageId: "parentProp",
          data: { prop: "size", icon: "Phosphor.PlusIcon" },
        },
      ],
    },
  ],
});
