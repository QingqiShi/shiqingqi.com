import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function PopoverLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/popover"
      description={t({
        en: "Arbitrary content hung off a trigger and placed against the window, so the side flips and the panel shifts to stay on screen — dismissed by Escape, an outside pointer, or focus leaving, and never trapping either focus or scroll.",
        zh: "挂在触发元素上的任意内容，相对窗口定位，因此会翻转方向、平移位置以始终留在屏幕内——按 Escape、在外部点击或让焦点离开即可关闭，且从不捕获焦点或锁定滚动。",
      })}
    >
      {children}
    </LabArticle>
  );
}
