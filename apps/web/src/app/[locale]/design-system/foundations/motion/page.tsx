import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { MotionShowcase } from "#src/design-system/sections/foundations/motion-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/motion",
  });
}

export default function MotionPage() {
  return (
    <DocPage
      path="/design-system/foundations/motion"
      description={t({
        en: "The components animate themselves. Move your own element on the same spring, and it keeps pace with them.",
        zh: "组件会自行处理动效。让你自己的元素基于同一个弹簧移动，它就能与组件保持同样的节奏。",
      })}
    >
      <MotionShowcase />
    </DocPage>
  );
}
