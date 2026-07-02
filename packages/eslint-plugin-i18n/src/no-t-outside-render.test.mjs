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
            import { t } from "#src/i18n";
            function MyComponent() {
              const label = t({ en: "Hello", zh: "你好" });
              return <div>{label}</div>;
            }
          `,
    },
    // V2: In JSX children
    {
      code: `
            import { t } from "#src/i18n";
            function MyComponent() {
              return <div>{t({ en: "Hello", zh: "你好" })}</div>;
            }
          `,
    },
    // V3: In JSX attribute
    {
      code: `
            import { t } from "#src/i18n";
            function MyComponent() {
              return <button aria-label={t({ en: "Close", zh: "关闭" })} />;
            }
          `,
    },
    // V4: In template literal in render scope
    {
      code: `
            import { t } from "#src/i18n";
            function MyComponent() {
              return <div aria-label={\`\${t({ en: "Rating:", zh: "评分:" })} \${value}\`} />;
            }
          `,
    },
    // V5: In ternary/conditional in render scope
    {
      code: `
            import { t } from "#src/i18n";
            function MyComponent() {
              const label = isActive ? t({ en: "Active", zh: "活跃" }) : t({ en: "Inactive", zh: "不活跃" });
              return <div>{label}</div>;
            }
          `,
    },
    // V6: Non-exported helper function called only from render scope
    {
      code: `
            import { t } from "#src/i18n";
            function formatRuntime(mins) {
              return \`\${mins}\${t({ en: "m", zh: " 分钟" })}\`;
            }
            function MyComponent() {
              return <div>{formatRuntime(120)}</div>;
            }
          `,
    },
    // V7: Non-exported local component (uppercase name)
    {
      code: `
            import { t } from "#src/i18n";
            function HelperButton() {
              return <button>{t({ en: "Click", zh: "点击" })}</button>;
            }
            export function MyComponent() {
              return <HelperButton />;
            }
          `,
    },
    // V8: Inside a custom hook
    {
      code: `
            import { t } from "#src/i18n";
            function useMyLabel() {
              return t({ en: "Hello", zh: "你好" });
            }
          `,
    },
    // V9: export default function (component)
    {
      code: `
            import { t } from "#src/i18n";
            export default function Page() {
              return <div>{t({ en: "Welcome", zh: "欢迎" })}</div>;
            }
          `,
    },
    // V10: Helper called from multiple components (all render scope)
    {
      code: `
            import { t } from "#src/i18n";
            function getLabel() {
              return t({ en: "Label", zh: "标签" });
            }
            function ComponentA() {
              return <div>{getLabel()}</div>;
            }
            function ComponentB() {
              return <span>{getLabel()}</span>;
            }
          `,
    },
    // V11: generateMetadata (whitelisted)
    {
      code: `
            import { t } from "#src/i18n.ts";
            export function generateMetadata() {
              return { title: t({ en: "My Page", zh: "我的页面" }) };
            }
          `,
    },
    // V12: Server component — t() in component body
    {
      code: `
            import { t } from "#src/i18n.ts";
            export default function Page() {
              return <div>{t({ en: "Hello", zh: "你好" })}</div>;
            }
          `,
    },
    // V13: Server component — helper function called from render scope
    {
      code: `
            import { t } from "#src/i18n.ts";
            function formatLabel(name) {
              return \`\${t({ en: "Name:", zh: "名称:" })} \${name}\`;
            }
            export default function Page() {
              return <div>{formatLabel("test")}</div>;
            }
          `,
    },
    // No t import — t() calls should be ignored
    {
      code: `
            function t(obj) { return obj.en; }
            const label = t({ en: "Hello", zh: "你好" });
          `,
    },
    // Anonymous default export component
    {
      code: `
            import { t } from "#src/i18n";
            export default function() {
              return <div>{t({ en: "Hello", zh: "你好" })}</div>;
            }
          `,
    },
  ],

  invalid: [
    // I1: Inside useEffect callback
    {
      code: `
            import { t } from "#src/i18n";
            function MyComponent() {
              useEffect(() => {
                document.title = t({ en: "Hello", zh: "你好" });
              }, []);
              return <div />;
            }
          `,
      errors: [{ messageId: "outsideRender" }],
    },
    // I2: Inside useLayoutEffect callback
    {
      code: `
            import { t } from "#src/i18n";
            function MyComponent() {
              useLayoutEffect(() => {
                ref.current.textContent = t({ en: "Hello", zh: "你好" });
              }, []);
              return <div ref={ref} />;
            }
          `,
      errors: [{ messageId: "outsideRender" }],
    },
    // I3: Inside inline event handler
    {
      code: `
            import { t } from "#src/i18n";
            function MyComponent() {
              return <button onClick={() => alert(t({ en: "Clicked", zh: "已点击" }))}>Click</button>;
            }
          `,
      errors: [{ messageId: "outsideRender" }],
    },
    // I4: Inside named event handler function defined in component
    {
      code: `
            import { t } from "#src/i18n";
            function MyComponent() {
              function handleClick() {
                alert(t({ en: "Clicked", zh: "已点击" }));
              }
              return <button onClick={handleClick}>Click</button>;
            }
          `,
      errors: [{ messageId: "outsideRender" }],
    },
    // I5: Inside setTimeout callback
    {
      code: `
            import { t } from "#src/i18n";
            function MyComponent() {
              setTimeout(() => {
                console.log(t({ en: "Timeout", zh: "超时" }));
              }, 1000);
              return <div />;
            }
          `,
      errors: [{ messageId: "outsideRender" }],
    },
    // I6: Exported non-component function
    {
      code: `
            import { t } from "#src/i18n";
            export function getLabel() {
              return t({ en: "Label", zh: "标签" });
            }
          `,
      errors: [{ messageId: "outsideRender" }],
    },
    // I7: Function passed as callback to .map()
    {
      code: `
            import { t } from "#src/i18n";
            function MyComponent() {
              const labels = items.map(() => t({ en: "Item", zh: "项目" }));
              return <div>{labels}</div>;
            }
          `,
      errors: [{ messageId: "outsideRender" }],
    },
    // I8: Inside .then() callback
    {
      code: `
            import { t } from "#src/i18n";
            function MyComponent() {
              fetch("/api").then(() => {
                console.log(t({ en: "Done", zh: "完成" }));
              });
              return <div />;
            }
          `,
      errors: [{ messageId: "outsideRender" }],
    },
    // I9: At module scope
    {
      code: `
            import { t } from "#src/i18n.ts";
            const LABEL = t({ en: "Hello", zh: "你好" });
          `,
      errors: [{ messageId: "outsideRender" }],
    },
    // I10: Helper function that is also passed as callback
    {
      code: `
            import { t } from "#src/i18n";
            function getLabel() {
              return t({ en: "Label", zh: "标签" });
            }
            function MyComponent() {
              const label = getLabel();
              return <button onClick={() => setLabel(getLabel())}>{label}</button>;
            }
          `,
      errors: [{ messageId: "outsideRender" }],
    },
    // I11: Helper function that is exported
    {
      code: `
            import { t } from "#src/i18n";
            export function getLabel() {
              return t({ en: "Label", zh: "标签" });
            }
            function MyComponent() {
              return <div>{getLabel()}</div>;
            }
          `,
      errors: [{ messageId: "outsideRender" }],
    },
    // I12: Function expression assigned to variable and used as event handler
    {
      code: `
            import { t } from "#src/i18n";
            function MyComponent() {
              const handler = () => {
                alert(t({ en: "Hello", zh: "你好" }));
              };
              return <button onClick={handler}>Click</button>;
            }
          `,
      errors: [{ messageId: "outsideRender" }],
    },
    // I13: Server component — module scope (even with component below)
    {
      code: `
            import { t } from "#src/i18n.ts";
            const LABEL = t({ en: "Hello", zh: "你好" });
            export default function Page() {
              return <div>{LABEL}</div>;
            }
          `,
      errors: [{ messageId: "outsideRender" }],
    },
    // I14: Server component — exported non-component function
    {
      code: `
            import { t } from "#src/i18n.ts";
            export function getLabel() {
              return t({ en: "Label", zh: "标签" });
            }
          `,
      errors: [{ messageId: "outsideRender" }],
    },
  ],
});
