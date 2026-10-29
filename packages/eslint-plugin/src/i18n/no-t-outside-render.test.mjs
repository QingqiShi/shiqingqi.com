import { createRequire } from "node:module";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);
const rule = require("./no-t-outside-render");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

// RuleTester.run registers its own describe/it blocks,
// so call it at the top level (not inside an it() block).
ruleTester.run("no-t-outside-render", rule, {
  valid: [
    // V1: Direct in component render body
    {
      code: `
            import { t } from "@tuja/i18n";
            function MyComponent() {
              const label = t({ en: "Hello", zh: "你好" });
              return <div>{label}</div>;
            }
          `,
    },
    // V6: Non-exported helper function called only from render scope
    {
      code: `
            import { t } from "@tuja/i18n";
            function formatRuntime(mins) {
              return \`\${mins}\${t({ en: "m", zh: " 分钟" })}\`;
            }
            function MyComponent() {
              return <div>{formatRuntime(120)}</div>;
            }
          `,
    },
    // V11: generateMetadata (whitelisted)
    {
      code: `
            import { t } from "@tuja/i18n";
            export function generateMetadata() {
              return { title: t({ en: "My Page", zh: "我的页面" }) };
            }
          `,
    },
  ],

  invalid: [
    // I1: Inside useEffect callback
    {
      code: `
            import { t } from "@tuja/i18n";
            function MyComponent() {
              useEffect(() => {
                document.title = t({ en: "Hello", zh: "你好" });
              }, []);
              return <div />;
            }
          `,
      errors: [{ messageId: "outsideRender" }],
    },
    // I3: Inside inline event handler
    {
      code: `
            import { t } from "@tuja/i18n";
            function MyComponent() {
              return <button onClick={() => alert(t({ en: "Clicked", zh: "已点击" }))}>Click</button>;
            }
          `,
      errors: [{ messageId: "outsideRender" }],
    },
    // I9: At module scope
    {
      code: `
            import { t } from "@tuja/i18n";
            const LABEL = t({ en: "Hello", zh: "你好" });
          `,
      errors: [{ messageId: "outsideRender" }],
    },
  ],
});
