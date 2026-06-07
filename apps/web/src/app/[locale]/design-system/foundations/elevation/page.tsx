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
    title: t({ en: "Elevation", zh: "阴影层级" }),
  });
}

export default function ElevationPage() {
  return (
    <DocPage
      title={t({ en: "Elevation", zh: "阴影层级" })}
      description={t({
        en: "A layered shadow scale that lifts surfaces off the page — from a hairline rest state up to floating overlays.",
        zh: "分层的阴影阶梯，将表面从页面上抬起——从细微的静止状态到悬浮的覆盖层。",
      })}
    >
      <ShadowsShowcase />
    </DocPage>
  );
}
