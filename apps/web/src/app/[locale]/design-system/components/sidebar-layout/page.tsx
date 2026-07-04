import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { SidebarLayoutShowcase } from "#src/components/design-system/sections/components/sidebar-layout-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/sidebar-layout",
    title: t({ en: "Sidebar layout", zh: "侧边栏布局" }),
    description: t({
      en: "A full-bleed page shell with a sticky navigation rail. The rail hugs the start edge while the content stays centered at a readable width; rail width and sticky offset are overridable per page.",
      zh: "带粘性导航侧栏的全出血页面骨架。侧栏贴住起始边缘，内容以可读宽度居中；侧栏宽度与粘性偏移可按页覆盖。",
    }),
  });
}

export default function SidebarLayoutPage() {
  return (
    <DocPage
      title={t({ en: "Sidebar layout", zh: "侧边栏布局" })}
      description={t({
        en: "A full-bleed page shell with a sticky navigation rail. Supply a sidebar and the content; the shell owns the responsive columns, the sticky offset that clears the header, and the readable content cap.",
        zh: "带粘性导航侧栏的全出血页面骨架。提供 sidebar 与内容即可；骨架负责响应式分栏、避开页头的粘性偏移，以及可读的内容宽度上限。",
      })}
    >
      <SidebarLayoutShowcase />
    </DocPage>
  );
}
