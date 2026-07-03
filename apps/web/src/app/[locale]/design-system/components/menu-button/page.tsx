import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { MenuShowcase } from "#src/components/design-system/sections/components/menu-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/menu-button",
    title: t({ en: "Menu button", zh: "菜单按钮" }),
  });
}

export default function MenuButtonPage() {
  return (
    <DocPage
      title={t({ en: "Menu button", zh: "菜单按钮" })}
      description={t({
        en: "A button that expands into a popup menu with a FLIP-animated reveal. Manages focus, keyboard navigation, and dismissal; pair it with menu labels and items.",
        zh: "点击后以 FLIP 动画展开为弹出菜单的按钮。自动管理焦点、键盘导航与关闭；可搭配菜单标签与菜单项使用。",
      })}
    >
      <MenuShowcase />
    </DocPage>
  );
}
