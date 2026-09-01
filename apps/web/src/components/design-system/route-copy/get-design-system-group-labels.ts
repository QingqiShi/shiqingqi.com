import "server-only";
import { t } from "#src/i18n.ts";
import type {
  DesignSystemCategoryId,
  DesignSystemSectionId,
} from "../routes/types.ts";

export interface DesignSystemGroupLabels {
  /** `null` for `overview`, which is a single unheaded link rather than a group. */
  sections: Record<DesignSystemSectionId, string | null>;
  categories: Record<DesignSystemCategoryId, string>;
}

/**
 * The headings for both levels of the route map, so the rail reads as a table of
 * contents for the overview page rather than a second, differently-worded index.
 *
 * Called from a server component, which is render scope the
 * `no-t-outside-render` rule cannot follow across a module boundary.
 */
export function getDesignSystemGroupLabels(): DesignSystemGroupLabels {
  return {
    sections: {
      overview: null,
      foundations: t({ en: "Foundations", zh: "基础" }),
      components: t({ en: "Components", zh: "组件" }),
      composition: t({ en: "Composition", zh: "组合" }),
    },
    categories: {
      visual: t({ en: "Visual", zh: "视觉" }),
      behaviour: t({ en: "Behaviour", zh: "行为" }),
      content: t({ en: "Content", zh: "内容" }),
      actions: t({ en: "Actions", zh: "操作控件" }),
      forms: t({ en: "Forms", zh: "表单控件" }),
      dataDisplay: t({ en: "Data display", zh: "信息展示" }),
      feedback: t({ en: "Feedback", zh: "反馈" }),
      surfaces: t({ en: "Surfaces", zh: "表面" }),
      shells: t({ en: "Page shells", zh: "页面骨架" }),
    },
  };
}
