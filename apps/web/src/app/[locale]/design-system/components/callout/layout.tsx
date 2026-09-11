import type { ReactNode } from "react";
import { DocArticle } from "#src/components/design-system/doc-article.tsx";

export default function CalloutLayout({ children }: { children: ReactNode }) {
  return (
    <DocArticle path="/design-system/components/callout">{children}</DocArticle>
  );
}
