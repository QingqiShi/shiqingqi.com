import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { PrimitivesShowcase } from "#src/design-system/sections/primitives/primitives-showcase.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
import { designSystemMetadata } from "../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/primitives",
    description: t({
      en: "Composable StyleX primitives — flex, layout, motion, reset, and accessibility — for building your own element when no component fits.",
      zh: "可组合的 StyleX 原语——flex、布局、动效、重置与无障碍——在没有合适组件、需要自行构建元素时使用。",
    }),
  });
}

export default function PrimitivesPage() {
  return (
    <DocPage
      path="/design-system/primitives"
      description={t({
        en: "Building blocks for your own elements: multi-property StyleX primitives you compose directly when no component fits. Each bundles a common cluster of properties — flex layouts, position fills, motion presets, resets, and accessibility helpers — so a bespoke surface still inherits the system's defaults instead of hand-rolling CSS.",
        zh: "自行构建元素时的构建块：当没有组件契合时，你可以直接组合的多属性 StyleX 原语。每个都封装了一组常见属性——flex 布局、定位填充、动效预设、重置与无障碍辅助——让定制表面仍能继承系统默认值，而无需手写 CSS。",
      })}
    >
      <PrimitivesShowcase />
    </DocPage>
  );
}
