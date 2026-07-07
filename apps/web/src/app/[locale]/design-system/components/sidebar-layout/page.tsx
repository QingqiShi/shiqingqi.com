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
      en: "An app-density page shell with a sticky navigation rail — title, navigation, and utilities — that collapses into a drawer on mobile. The content stays centered at a readable width beside it.",
      zh: "应用密度的页面骨架，带标题、导航与实用控件的粘性侧栏，移动端收起为抽屉。内容在侧栏旁以可读宽度居中。",
    }),
  });
}

export default function SidebarLayoutPage() {
  return (
    <DocPage
      title={t({ en: "Sidebar layout", zh: "侧边栏布局" })}
      description={t({
        en: "An app-density page shell for app-like surfaces. Supply the navigation, an optional title and utility slots, and the content; the shell owns the responsive columns, the mobile drawer, and the readable content cap.",
        zh: "面向应用型页面的应用密度骨架。提供导航、可选的标题与实用插槽以及内容即可；骨架负责响应式分栏、移动端抽屉与可读的内容宽度上限。",
      })}
    >
      <SidebarLayoutShowcase />
    </DocPage>
  );
}
