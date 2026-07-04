import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { MotionShowcase } from "#src/components/design-system/sections/tokens/motion-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/motion",
    title: t({ en: "Motion", zh: "动效" }),
    description: t({
      en: "Duration and easing tokens, live transition and keyframe presets, and the reduced-motion fallbacks that ship in the base.",
      zh: "时长与缓动令牌、可实时预览的过渡与关键帧预设，以及底层内置的减少动态效果回退。",
    }),
  });
}

export default function MotionPage() {
  return (
    <DocPage
      title={t({ en: "Motion", zh: "动效" })}
      description={t({
        en: "The timing language of the system: a duration scale, a set of easing curves, and ready-made transition and keyframe presets — each with a prefers-reduced-motion fallback baked in.",
        zh: "系统的时间语言：一套时长阶梯、一组缓动曲线，以及现成的过渡与关键帧预设——每一项都内置了 prefers-reduced-motion 回退。",
      })}
    >
      <MotionShowcase />
    </DocPage>
  );
}
