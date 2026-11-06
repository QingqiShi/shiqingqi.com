import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function TabViewLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/tab-view"
      description={t({
        en: "The frame of an app with a few top-level destinations, which you declare once.",
        zh: "适用于只有少数几个顶层目标页的应用框架。目标页只需声明一次。",
      })}
    >
      {children}
    </LabArticle>
  );
}
