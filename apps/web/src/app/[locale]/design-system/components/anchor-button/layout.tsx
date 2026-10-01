import type { ReactNode } from "react";
import { DocArticle } from "#src/design-system/doc-article.tsx";

export default function AnchorButtonLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DocArticle path="/design-system/components/anchor-button">
      {children}
    </DocArticle>
  );
}
