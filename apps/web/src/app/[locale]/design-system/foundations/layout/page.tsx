import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { LayoutShowcase } from "#src/components/design-system/sections/tokens/layout-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/layout",
    title: t({ en: "Layout & breakpoints", zh: "布局与断点" }),
    description: t({
      en: "Min-width breakpoints with a live band indicator, the content-width cap, the responsive control-size ramp, the named z-index scale, and aspect-ratio tokens.",
      zh: "带实时区间指示的最小宽度断点、内容宽度上限、响应式控件尺寸阶梯、具名 z-index 阶梯，以及宽高比令牌。",
    }),
  });
}

export default function LayoutPage() {
  return (
    <DocPage
      title={t({ en: "Layout & breakpoints", zh: "布局与断点" })}
      description={t({
        en: "The scaffolding tokens: mobile-first breakpoints, the 1140px content cap, a control-size ramp that scales up for touch, a named z-index scale, and aspect ratios for media frames.",
        zh: "构建骨架的令牌：移动端优先的断点、1140px 的内容上限、为触摸放大的控件尺寸阶梯、具名的 z-index 阶梯，以及用于媒体框的宽高比。",
      })}
    >
      <LayoutShowcase />
    </DocPage>
  );
}
