import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { ShadowsShowcase } from "#src/components/design-system/sections/tokens/shadows-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/elevation",
  });
}

export default function ElevationPage() {
  return (
    <DocPage
      path="/design-system/foundations/elevation"
      description={t({
        en: "A layered elevation scale: six levels that lift a surface off the page — from a hairline rest state up to floating overlays — plus one inset that sinks a well into it.",
        zh: "分层的层深阶梯：六个把表面抬离页面的层级——从细微的静止状态到悬浮的覆盖层——另有一个把凹位压入页面的内嵌。",
      })}
    >
      <ShadowsShowcase />
    </DocPage>
  );
}
