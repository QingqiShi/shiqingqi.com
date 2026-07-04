import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { IconButtonShowcase } from "#src/components/design-system/sections/components/icon-button-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/icon-button",
    title: t({ en: "Icon button", zh: "图标按钮" }),
    description: t({
      en: "A compact, icon-only button in three sizes, two variants, and two shapes. A required accessible name is enforced at the type level, so an unlabelled icon button cannot ship.",
      zh: "紧凑的纯图标按钮，提供三种尺寸、两种风格与两种形状。类型层面强制要求无障碍名称，因此无法发布未命名的图标按钮。",
    }),
  });
}

export default function IconButtonPage() {
  return (
    <DocPage
      title={t({ en: "Icon button", zh: "图标按钮" })}
      description={t({
        en: "A compact, icon-only button. The plain variant is a transparent affordance for inline use over a surface; the surface variant floats over scrolling content with a fill and shadow. It renders a real button element, so keyboard focus and activation work for free — and because it has no visible text, an aria-label or aria-labelledby is required at the type level.",
        zh: "紧凑的纯图标按钮。plain 变体为透明控件，适合置于表面之上的行内使用；surface 变体带填充与阴影，悬浮于滚动内容之上。它渲染真实的 button 元素，因此键盘聚焦与激活开箱即用——由于没有可见文字，类型层面要求提供 aria-label 或 aria-labelledby。",
      })}
    >
      <IconButtonShowcase />
    </DocPage>
  );
}
