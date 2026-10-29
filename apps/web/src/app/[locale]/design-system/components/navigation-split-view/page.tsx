import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { NavigationSplitViewShowcase } from "#src/design-system/sections/components/navigation-split-view-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/navigation-split-view",
  });
}

export default function NavigationSplitViewPage() {
  return (
    <DocPage
      path="/design-system/components/navigation-split-view"
      description={t({
        en: "Up to three columns, each with its own scroll: a sidebar, the content, and the detail of what is picked. The sidebar folds while the detail shows, and on a phone the content fills the view and the detail opens in a sheet.",
        zh: "最多三栏，每栏各自滚动：侧栏、内容，以及所选项的详情。详情显示时侧栏收起；在手机上，内容栏占满视图，详情在面板中打开。",
      })}
    >
      <NavigationSplitViewShowcase />
    </DocPage>
  );
}
