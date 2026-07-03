import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { SkeletonShowcase } from "#src/components/design-system/sections/components/skeleton-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/skeleton",
    title: t({ en: "Skeleton", zh: "骨架屏" }),
  });
}

export default function SkeletonPage() {
  return (
    <DocPage
      title={t({ en: "Skeleton", zh: "骨架屏" })}
      description={t({
        en: "Placeholder shapes that hold a layout's space while content loads. Size them explicitly, let them fill their container, or stagger their pulse across a group.",
        zh: "在内容加载时占位的骨架形状。可以显式设定尺寸、让其填满容器，或让一组骨架的脉动错峰呈现。",
      })}
    >
      <SkeletonShowcase />
    </DocPage>
  );
}
