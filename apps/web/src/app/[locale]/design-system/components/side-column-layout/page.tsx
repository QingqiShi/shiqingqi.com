import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { SideColumnLayoutShowcase } from "#src/design-system/sections/components/side-column-layout-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/side-column-layout",
  });
}

export default function SideColumnLayoutPage() {
  return (
    <DocPage
      path="/design-system/components/side-column-layout"
      description={t({
        en: "Main content and a column at its end, such as an assistant beside the page it talks about. The column pushes the content, keeps its own scroll, and tells the page where it has no room.",
        zh: "主内容与其末端的一栏，例如页面旁讨论该页面的助手。侧栏推开内容，自己单独滚动，并在放不下时告诉页面。",
      })}
    >
      <SideColumnLayoutShowcase />
    </DocPage>
  );
}
