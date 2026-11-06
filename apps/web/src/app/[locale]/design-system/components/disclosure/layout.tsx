import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function DisclosureLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <LabArticle
      path="/design-system/components/disclosure"
      description={t({
        en: "A header row that reveals a panel beneath it. The component covers the case where the whole header is the trigger; the useDisclosure hook underneath covers the rest, keeping the same ARIA wiring.",
        zh: "点击标题行展开下方面板。当整个标题行即触发器时使用该组件；其余情形可使用底层的 useDisclosure 钩子，两者共享同一套 ARIA 关联。",
      })}
    >
      {children}
    </LabArticle>
  );
}
