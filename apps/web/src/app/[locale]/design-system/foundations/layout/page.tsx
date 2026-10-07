import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { ControlSizeShowcase } from "#src/design-system/sections/foundations/control-size-showcase.tsx";
import { LayoutRhythmGuide } from "#src/design-system/sections/foundations/layout-rhythm-guide.tsx";
import { LayoutShowcase } from "#src/design-system/sections/foundations/layout-showcase.tsx";
import { LayoutSpaceGuide } from "#src/design-system/sections/foundations/layout-space-guide.tsx";
import { SpaceScaleShowcase } from "#src/design-system/sections/foundations/space-scale-showcase.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/layout",
    description: t({
      en: "Which length token to use where: rhythm between things, space around them, controlSize inside a control, the min-width breakpoints, the 1140px content width, the layer planes for z-index, and the ratio tokens.",
      zh: "哪种长度令牌用在哪里：事物之间用 rhythm，事物周围用 space，控件内部用 controlSize，以及最小宽度断点、1140px 内容宽度、用于 z-index 的 layer 各层与 ratio 令牌。",
    }),
  });
}

export default function LayoutPage() {
  return (
    <DocPage
      path="/design-system/foundations/layout"
      description={t({
        en: "The components take their spacing, control sizes, breakpoints and z-indexes from @tuja/ui/tokens.stylex and @tuja/ui/breakpoints.stylex. Take yours from the same place, and what you build lines up with the components and changes with the screen when they do.",
        zh: "组件的间距、控件尺寸、断点与 z-index 都取自 @tuja/ui/tokens.stylex 与 @tuja/ui/breakpoints.stylex。你的也从这里取，你搭建的东西就能与组件对齐，并与它们在同一时刻随屏幕变化。",
      })}
    >
      <LayoutSpaceGuide />
      <LayoutRhythmGuide />
      <SpaceScaleShowcase />
      <ControlSizeShowcase />
      <LayoutShowcase />
    </DocPage>
  );
}
