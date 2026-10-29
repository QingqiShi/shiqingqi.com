import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { SkeletonShowcase } from "#src/design-system/sections/components/skeleton-showcase.tsx";
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
