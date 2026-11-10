import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function BadgeLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/badge"
      description={t({
        en: "Compact status and label indicators. The six Intents plus a bordered default, at two sizes, a status dot, and a line of facts to hold them.",
        zh: "紧凑的状态和标签指示器。六种意图色，加一个带边框的默认样式，支持两种尺寸；另有状态圆点，以及容纳它们的事实行。",
      })}
    >
      {children}
    </LabArticle>
  );
}
