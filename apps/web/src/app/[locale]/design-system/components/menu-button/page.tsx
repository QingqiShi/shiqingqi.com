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
        en: "A button that expands into a popup with a FLIP-animated reveal. The default menu role moves focus into the popup and roves its items with the arrow keys; the group role is for popups that hold controls instead of commands. Both dismiss on Escape and on a click outside.",
        zh: "点击后以 FLIP 动画展开为弹层的按钮。默认的 menu 角色会把焦点移入弹层，并用方向键在各项间移动；group 角色用于装控件而非命令的弹层。两者都可用 Escape 或点击弹层外关闭。",
      })}
    >
      <MenuShowcase />
    </DocPage>
  );
}
