import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { MotionShowcase } from "#src/design-system/sections/foundations/motion-showcase.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/motion",
    description: t({
      en: "Animate your own elements to match the components: the motion presets, the duration and easing constants, reduced motion, and pausing loops.",
      zh: "让你自己的元素与组件动得一致：动效预设、时长与缓动常量、减弱动效，以及暂停循环。",
    }),
  });
}

export default function MotionPage() {
  return (
    <DocPage
      path="/design-system/foundations/motion"
      description={t({
        en: "The components animate themselves and handle reduced motion. This page is for the motion you write yourself, with the presets and constants from @tuja/ui/primitives/motion.stylex.",
        zh: "组件会自行处理动效与减弱动效。本页讲的是你自己编写的动效，使用 @tuja/ui/primitives/motion.stylex 中的预设与常量。",
      })}
    >
      <MotionShowcase />
    </DocPage>
  );
}
