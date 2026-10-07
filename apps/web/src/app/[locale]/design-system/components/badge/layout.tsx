import type { ReactNode } from "react";
import { DocArticle } from "#src/design-system/doc-article.tsx";
import { t } from "#src/i18n.ts";

export default function BadgeLayout({ children }: { children: ReactNode }) {
  return (
    <DocArticle
      path="/design-system/components/badge"
      description={t({
        en: "Compact status and label indicators. The six Intents plus a bordered default, at two sizes.",
        zh: "紧凑的状态和标签指示器。六种意图色，加一个带边框的默认样式，并支持两种尺寸。",
      })}
    >
      {children}
    </DocArticle>
  );
}
