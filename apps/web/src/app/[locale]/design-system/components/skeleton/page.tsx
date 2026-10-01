import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { SkeletonShowcase } from "#src/design-system/sections/components/skeleton-showcase.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/skeleton",
  });
}

export default function SkeletonPage() {
  return (
    <DocPage
      path="/design-system/components/skeleton"
      description={t({
        en: "Placeholder shapes that hold a layout's space while content loads. Size them explicitly, let them fill their container, or stagger their pulse across a group.",
        zh: "在内容加载时占位的骨架形状。可以显式设定尺寸、让其填满容器，或让一组骨架的脉动错峰呈现。",
      })}
    >
      <SkeletonShowcase />
    </DocPage>
  );
}
