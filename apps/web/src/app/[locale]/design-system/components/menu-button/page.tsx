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
  });
}

export default function MenuButtonPage() {
  return (
    <DocPage
      path="/design-system/components/menu-button"
      description={t({
        en: "A button that expands into a popup: a surface grows out of the trigger while the content fades in over it. The default menu role moves focus into the popup and roves its items with the arrow keys; the group role is for popups that hold controls instead of commands. Both dismiss on Escape and on a click outside.",
        zh: "点击后展开为弹层的按钮：一块背景面从按钮生长开来，内容在其上淡入。默认的 menu 角色会把焦点移入弹层，并用方向键在各项间移动；group 角色用于装控件而非命令的弹层。两者都可用 Escape 或点击弹层外关闭。",
      })}
    >
      <MenuShowcase />
    </DocPage>
  );
}
