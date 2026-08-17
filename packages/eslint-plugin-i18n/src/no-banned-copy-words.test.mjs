import { createRequire } from "node:module";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);
const rule = require("./no-banned-copy-words");

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
ruleTester.run("no-banned-copy-words", rule, {
  valid: [
    // V1: Clean copy
    {
      code: `
            import { t } from "#src/i18n";
            const label = t({ en: "Add to watchlist", zh: "加入片单" });
          `,
    },
    // V2: Word-boundary — "There" contains "here" as a substring but not as a word
    {
      code: `
            import { t } from "#src/i18n";
            const label = t({ en: "There is nothing to show", zh: "没有可显示的内容" });
          `,
    },
    // V3: Word-boundary — "uneasy" contains "easy" as a substring but not as a word
    {
      code: `
            import { t } from "#src/i18n";
            const label = t({ en: "Feeling uneasy about this", zh: "对此感到不安" });
          `,
    },
    // V4: Non-t() call is ignored
    {
      code: `
            function t(obj) { return obj.en; }
            const label = t({ en: "Just do it", zh: "尽管去做" });
          `,
    },
    // V5: Banned word only in zh — zh is out of scope for this rule
    {
      code: `
            import { t } from "#src/i18n";
            const label = t({ en: "Add to watchlist", zh: "简单地加入片单" });
          `,
    },
    // V6: Non-literal en value is ignored (can't statically check)
    {
      code: `
            import { t } from "#src/i18n";
            const label = t({ en: someVariable, zh: "标签" });
          `,
    },
    // V7: Template literal with interpolation is ignored (can't statically check)
    {
      code: `
            import { t } from "#src/i18n";
            const label = t({ en: \`Just \${count} left\`, zh: \`还剩 \${count} 个\` });
          `,
    },
    // V8: No t import — t() calls should be ignored
    {
      code: `
            function t(obj) { return obj.en; }
            const label = t({ en: "Simply the best", zh: "最好的" });
          `,
    },
    // V9: "invalid" as part of the attribute name "aria-invalid" is exempt
    {
      code: `
            import { t } from "#src/i18n";
            const label = t({ en: "The field sets aria-invalid when the value fails validation", zh: "字段校验失败时会设置 aria-invalid" });
          `,
    },
    // V10: Case-insensitive attribute-name exemption
    {
      code: `
            import { t } from "#src/i18n";
            const label = t({ en: "ARIA-INVALID is set on error", zh: "出错时会设置 ARIA-INVALID" });
          `,
    },
  ],

  invalid: [
    // I1: Banned word in en (string literal)
    {
      code: `
            import { t } from "#src/i18n";
            const label = t({ en: "Simply the best", zh: "最好的" });
          `,
      errors: [{ messageId: "bannedWord", data: { word: "simply" } }],
    },
    // I2: Case-insensitive match
    {
      code: `
            import { t } from "#src/i18n";
            const label = t({ en: "JUST do it", zh: "尽管去做" });
          `,
      errors: [{ messageId: "bannedWord", data: { word: "just" } }],
    },
    // I3: "click here" is reported as the full phrase, not just "here"
    {
      code: `
            import { t } from "#src/i18n";
            const label = t({ en: "Click here to continue", zh: "点击此处继续" });
          `,
      errors: [{ messageId: "bannedWord", data: { word: "click here" } }],
    },
    // I4: Lone "here"
    {
      code: `
            import { t } from "#src/i18n";
            const label = t({ en: "Your results are here", zh: "结果在此" });
          `,
      errors: [{ messageId: "bannedWord", data: { word: "here" } }],
    },
    // I5: Template literal with no expressions
    {
      code: `
            import { t } from "#src/i18n";
            const label = t({ en: \`Sorry, something went wrong\`, zh: "出错了" });
          `,
      errors: [{ messageId: "bannedWord", data: { word: "sorry" } }],
    },
    // I6: Aliased t import
    {
      code: `
            import { t as translate } from "#src/i18n.ts";
            const label = translate({ en: "Invalid input", zh: "输入无效" });
          `,
      errors: [{ messageId: "bannedWord", data: { word: "invalid" } }],
    },
    // I7: "invalid" not preceded by "aria-" is still flagged, even alongside
    // an exempt "aria-invalid" mention
    {
      code: `
            import { t } from "#src/i18n";
            const label = t({ en: "aria-invalid marks the value as invalid", zh: "aria-invalid 表示该值无效" });
          `,
      errors: [{ messageId: "bannedWord", data: { word: "invalid" } }],
    },
    // I8: Only the "aria-invalid" attribute name is exempt — a different
    // compound like "data-invalid" still gets flagged
    {
      code: `
            import { t } from "#src/i18n";
            const label = t({ en: "Unlike aria-invalid, data-invalid is not a real attribute", zh: "与 aria-invalid 不同，data-invalid 不是真实属性" });
          `,
      errors: [{ messageId: "bannedWord", data: { word: "invalid" } }],
    },
  ],
});
