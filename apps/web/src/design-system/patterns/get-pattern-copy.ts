import "server-only";
import { t } from "@tuja/i18n";
import type { PatternPath } from "./pattern-paths.ts";

interface PatternCopy {
  name: string;
  /** When to start from this pattern, in one sentence. */
  description: string;
}

/** The Patterns page and each pattern's metadata read the same words. */
export function getPatternCopy(): Record<PatternPath, PatternCopy> {
  return {
    "/design-system/patterns/dashboard": {
      name: t({ en: "Dashboard", zh: "仪表盘" }),
      description: t({
        en: "For the page a visitor opens first: the figures they came for, then cards of what needs them, in a main column beside an aside.",
        zh: "用于访问者最先打开的页面：先是他们想看的数字，再是需要他们处理的事项卡片，主栏旁边配一个侧栏。",
      }),
    },
    "/design-system/patterns/settings": {
      name: t({ en: "Settings", zh: "设置" }),
      description: t({
        en: "For the choices that shape how an app behaves: one card per topic, one row per setting, and one Save at the end.",
        zh: "用于决定应用如何运作的选项：每个主题一张卡片，每个设置一行，最后一个保存按钮。",
      }),
    },
    "/design-system/patterns/list": {
      name: t({ en: "List", zh: "列表" }),
      description: t({
        en: "For many records of one kind: the totals, a search and filters, and a table that turns into a list on a phone.",
        zh: "用于同一类的大量记录：汇总数字、搜索与筛选，以及一个在手机上变成列表的表格。",
      }),
    },
    "/design-system/patterns/form": {
      name: t({ en: "Form", zh: "表单" }),
      description: t({
        en: "For adding or editing one thing: fields in cards by topic, each error under its field, and the actions at the end.",
        zh: "用于新增或编辑一件事物：字段按主题放进卡片，错误显示在对应字段下方，操作按钮放在最后。",
      }),
    },
  };
}
