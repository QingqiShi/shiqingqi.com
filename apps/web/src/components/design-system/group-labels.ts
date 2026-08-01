"use client";

import { t } from "#src/i18n.ts";
import type {
  DesignSystemCategoryId,
  DesignSystemSectionId,
} from "./routes.ts";

export interface DesignSystemGroupLabels {
  /** `null` for `overview`, which is a single unheaded link rather than a group. */
  sections: Record<DesignSystemSectionId, string | null>;
  categories: Record<DesignSystemCategoryId, string>;
}

/**
 * The headings for both levels of the route map, shared by the nav rail and the
 * overview page so the rail reads as a table of contents for the page rather
 * than a second, differently-worded index.
 *
 * A hook rather than a constant: the i18n transform compiles `t()` to a lookup
 * hook, so these can only be resolved during a client render. That is also why
 * the copy for each individual route still lives in its consumer — the overview
 * page is a server component and resolves its own.
 */
// The hooks this calls only exist after the i18n transform, which ESLint runs
// before — the `use` prefix is required, not optional.
// eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix
export function useDesignSystemGroupLabels(): DesignSystemGroupLabels {
  return {
    sections: {
      overview: null,
      foundations: t({ en: "Foundations", zh: "基础" }),
      components: t({ en: "Components", zh: "组件" }),
      composition: t({ en: "Composition", zh: "组合" }),
    },
    categories: {
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
