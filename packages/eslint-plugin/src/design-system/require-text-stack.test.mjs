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

// RuleTester.run registers its own describe/it blocks,
// so call it at the top level (not inside an it() block).
ruleTester.run("require-text-stack", rule, {
  valid: [
    // V0: lines of text in one item, with no gap
    {
      code: `<div css={stack.text}><h2>Title</h2><p>Its own text.</p></div>`,
    },
    // V1: a label above a box
    {
      code: `<div css={stack.tight}><label>Name</label><input /></div>`,
    },
    // V2: one line of text
    {
      code: `<div css={stack.tight}><p>Only line</p></div>`,
    },
    // V3: content that is not known
    {
      code: `<div css={stack.tight}><h2>Title</h2>{children}</div>`,
    },
    // V4: a span without a type role can hold anything
    {
      code: `<div css={stack.tight}><span>One</span><span>Two</span></div>`,
    },
    // V5: a list of text items mapped from data
    {
      code: `<ul css={stack.tight}>{items.map((item) => <li key={item}>{item}</li>)}</ul>`,
    },
    // V6: a label that holds its control
    {
      code: `<div css={stack.tight}><span css={typeRole.label}>Frame 1</span><label css={typeRole.label}>ms <input /></label></div>`,
    },
    // V7: a display heading and its text at item
    {
      code: `<section css={stack.item}><h1 css={typeRole.display}>Hi</h1><p>Lead</p></section>`,
    },
    // V8: a large heading and its text at tight
    {
      code: `<div css={stack.tight}><Heading level={2}>Title</Heading><Text>Detail</Text></div>`,
    },
    // V9: a heading tag that takes a large type role, at tight
    {
      code: `<div css={stack.tight}><h4 css={[typeRole.h1, styles.title]}>Title</h4><p>Lead</p></div>`,
    },
    // V10: a heading tag that sets its size elsewhere
    {
      code: `<div css={stack.tight}><h2 css={styles.title}>Title</h2><p>Lead</p></div>`,
    },
    // V11: a heading with a small look, with no gap
    {
      code: `<div css={stack.text}><Heading level={2} look="h3">Title</Heading><Text>Detail</Text></div>`,
    },
    // V12: an h3 and its text, with no gap
    {
      code: `<div css={stack.text}><h3 css={typeRole.h3}>Title</h3><p>Detail</p></div>`,
    },
  ],
  invalid: [
    // I0: a small heading and its own text
    {
      code: `<header css={stack.tight}><h3>Title</h3><p>Its own text.</p></header>`,
      errors: [{ messageId: "textStack" }],
    },
    // I1: composed with other styles
    {
      code: `<div css={[stack.tight, styles.header]}><Heading level={3}>Title</Heading><Text>Detail</Text></div>`,
      errors: [{ messageId: "textStack" }],
    },
    // I2: typed spans, with a line that shows on a condition
    {
      code: `<div css={stack.tight}><span css={typeRole.label}>Name</span>{hint ? <span css={[typeRole.caption, styles.hint]}>{hint}</span> : null}</div>`,
      errors: [{ messageId: "textStack" }],
    },
    // I3: a spread of stylex.props
    {
      code: `<div {...stylex.props(stack.tight, styles.intro)}><h4>Title</h4>{note && <p>{note}</p>}</div>`,
      errors: [{ messageId: "textStack" }],
    },
    // I4: a large heading and its text with no gap
    {
      code: `<div css={stack.text}><Heading level={2}>Title</Heading><Text>Detail</Text></div>`,
      errors: [{ messageId: "headingStack" }],
    },
    // I5: a display heading and its lead with no gap
    {
      code: `<div css={stack.text}><h1 css={[typeRole.subDisplay, styles.title]}>Title</h1>{lead ? <p>{lead}</p> : null}</div>`,
      errors: [{ messageId: "headingStack" }],
    },
  ],
});
