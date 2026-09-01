import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { OverlayShowcase } from "#src/components/design-system/sections/components/overlay-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/overlay",
  });
}

export default function OverlayPage() {
  return (
    <DocPage
      path="/design-system/components/overlay"
      description={t({
        en: "A full-screen modal surface with a ViewTransition reveal. It owns the backdrop, focus trap, scroll lock, and Escape-to-close; you supply the content, the localised close label, and where it portals.",
        zh: "带 ViewTransition 揭示动画的全屏模态层。它负责背景、焦点捕获、滚动锁定与 Escape 关闭；使用方提供内容、本地化的关闭标签以及挂载位置。",
      })}
    >
      <OverlayShowcase />
    </DocPage>
  );
}
