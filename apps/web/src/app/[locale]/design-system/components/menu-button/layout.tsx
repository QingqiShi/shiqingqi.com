import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function MenuButtonLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <LabArticle
      path="/design-system/components/menu-button"
      description={t({
        en: "A button that expands into a popup: a surface grows out of the trigger while the content fades in over it. The default menu role moves focus into the popup and roves its items with the arrow keys; the group role is for popups that hold controls instead of commands. Both dismiss on Escape and on a click outside.",
        zh: "点击后展开为弹层的按钮：一块背景面从按钮生长开来，内容在其上淡入。默认的 menu 角色会把焦点移入弹层，并用方向键在各项间移动；group 角色用于装控件而非命令的弹层。两者都可用 Escape 或点击弹层外关闭。",
      })}
    >
      {children}
    </LabArticle>
  );
}
