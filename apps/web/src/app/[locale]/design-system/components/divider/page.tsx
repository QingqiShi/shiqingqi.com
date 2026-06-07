import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { DividerShowcase } from "#src/components/design-system/sections/components/divider-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/divider",
    title: t({ en: "Divider", zh: "分隔线" }),
  });
}

export default function DividerPage() {
  return (
    <DocPage
      title={t({ en: "Divider", zh: "分隔线" })}
      description={t({
        en: "Visual separators for content. Subtle for in-flow breaks, bold for stronger separation, decorative for accent moments.",
        zh: "用于分隔内容的视觉元素。柔和用于自然分段，强烈用于明显分隔，装饰用于点缀重点。",
      })}
    >
      <DividerShowcase />
    </DocPage>
  );
}
