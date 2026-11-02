import { createRequire } from "node:module";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);
const rule = require("./require-text-stack");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run("require-text-stack", rule, {
  valid: [
    // V1: a heading at h3 size and its text take no gap
    {
      code: `<div css={stack.text}>
        <h3 css={typeRole.h3}>Title</h3>
        <p css={typeRole.caption}>Detail</p>
      </div>`,
    },
    // V2: a label above a heading takes a gap
    {
      code: `<div css={stack.tight}>
        <span css={typeRole.label}>Overview</span>
        <h3 css={typeRole.h3}>Title</h3>
      </div>`,
    },
    // V3: a Text caption above a Heading takes a gap, even when the Heading is small
    {
      code: `<div css={stack.tight}>
        <Text look="caption">Overview</Text>
        <Heading level={3}>Title</Heading>
      </div>`,
    },
    // V4: body above a heading is not an eyebrow, so it takes no gap
    {
      code: `<div css={stack.text}>
        <Text look="body">Intro</Text>
        <h3 css={typeRole.h3}>Title</h3>
      </div>`,
    },
  ],

  invalid: [
    // I1: a label above a heading on stack.text
    {
      code: `<div css={stack.text}>
        <span css={typeRole.label}>Overview</span>
        <h3 css={typeRole.h3}>Title</h3>
      </div>`,
      errors: [{ messageId: "eyebrowStack" }],
    },
    // I2: a Text overline above a heading tag on stack.text
    {
      code: `<div css={stack.text}>
        <Text look="overline">Overview</Text>
        <h4>Title</h4>
      </div>`,
      errors: [{ messageId: "eyebrowStack" }],
    },
    // I3: a heading above a caption is not an eyebrow, so stack.tight is refused
    {
      code: `<div css={stack.tight}>
        <h3 css={typeRole.h3}>Title</h3>
        <p css={typeRole.caption}>Detail</p>
      </div>`,
      errors: [{ messageId: "textStack" }],
    },
    // I4: a heading at h2 size on stack.text
    {
      code: `<div css={stack.text}>
        <h2 css={typeRole.h2}>Title</h2>
        <p css={typeRole.body}>Text</p>
      </div>`,
      errors: [{ messageId: "headingStack" }],
    },
  ],
});
