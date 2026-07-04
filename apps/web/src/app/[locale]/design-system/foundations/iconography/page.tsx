import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { IconographyShowcase } from "#src/components/design-system/sections/tokens/iconography-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/iconography",
    title: t({ en: "Iconography", zh: "图标" }),
    description: t({
      en: "The Phosphor icon convention: per-glyph SSR imports, regular and bold weights, sizing with font-size, pairing with controls, and the aria-hidden rule for decorative glyphs.",
      zh: "Phosphor 图标约定：按字形的 SSR 引入、常规与加粗字重、随 font-size 缩放、与控件搭配，以及装饰性字形的 aria-hidden 规则。",
    }),
  });
}

export default function IconographyPage() {
  return (
    <DocPage
      title={t({ en: "Iconography", zh: "图标" })}
      description={t({
        en: "Icons come from Phosphor, imported one glyph at a time from the SSR entry so the client only ships what it uses. Two weights, sizing that follows font-size, and colour that follows currentColor — with accessible names handled by the control the icon sits in.",
        zh: "图标取自 Phosphor，从 SSR 入口按字形逐个引入，因此客户端只发送用到的部分。两种字重、随 font-size 变化的尺寸、随 currentColor 变化的颜色——可访问名称由图标所在的控件负责。",
      })}
    >
      <IconographyShowcase />
    </DocPage>
  );
}
