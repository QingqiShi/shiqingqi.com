import type { ReactNode } from "react";
import { DocArticle } from "#src/components/design-system/doc-article.tsx";

export default function SwitchLayout({ children }: { children: ReactNode }) {
  return (
    <DocArticle path="/design-system/components/switch">{children}</DocArticle>
  );
}
