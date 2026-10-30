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
    description: t({
      en: "Animate your own elements to match the components: the motion presets, the duration and easing constants, the motion engine and its spring roles, reduced motion, and pausing loops.",
      zh: "让你自己的元素与组件动得一致：动效预设、时长与缓动常量、动效引擎及其弹簧角色、减弱动效，以及暂停循环。",
    }),
  });
}

export default function MotionPage() {
  return (
    <DocPage
      path="/design-system/foundations/motion"
      description={t({
        en: "The components animate themselves and handle reduced motion. This page is for the motion you write yourself: in CSS with the presets and constants from @tuja/ui/primitives/motion.stylex, and on the motion engine from @tuja/ui/motion.",
        zh: "组件会自行处理动效与减弱动效。本页讲的是你自己编写的动效：在CSS中使用 @tuja/ui/primitives/motion.stylex的预设与常量，在动效引擎上使用 @tuja/ui/motion。",
      })}
    >
      <MotionShowcase />
    </DocPage>
  );
}
