import type { ReactNode } from "react";
import { DocArticle } from "#src/components/design-system/doc-article.tsx";

export default function AvatarLayout({ children }: { children: ReactNode }) {
  return (
    <DocArticle path="/design-system/components/avatar">{children}</DocArticle>
  );
}
