import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { PrimitivesShowcase } from "#src/components/design-system/sections/primitives/primitives-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/primitives",
    title: t({ en: "Primitives", zh: "原语" }),
    description: t({
      en: "Composable StyleX recipes — flex, layout, motion, reset, and accessibility — for the custom layer, when a page needs to compose its own thing below the components.",
      zh: "可组合的 StyleX 配方——flex、布局、动效、重置与无障碍——面向自定义层，当页面需要在组件之下自行组合时使用。",
    }),
  });
}

export default function PrimitivesPage() {
  return (
    <DocPage
      title={t({ en: "Primitives", zh: "原语" })}
      description={t({
        en: "The custom layer's building blocks: multi-property StyleX recipes you compose directly when no component fits. Each bundles a common cluster of properties — flex layouts, position fills, motion presets, resets, and accessibility helpers — so a bespoke surface still inherits the system's defaults instead of hand-rolling CSS.",
        zh: "自定义层的构建块：当没有组件契合时，你可以直接组合的多属性 StyleX 配方。每个都封装了一组常见属性——flex 布局、定位填充、动效预设、重置与无障碍辅助——让定制表面仍能继承系统默认值，而无需手写 CSS。",
      })}
    >
      <PrimitivesShowcase />
    </DocPage>
  );
}
