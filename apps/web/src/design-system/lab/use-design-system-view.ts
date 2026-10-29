import { normalizePath } from "@tuja/i18n/normalize-path";
import { usePathname } from "next/navigation";
import type { DesignSystemView } from "#src/design-system/routes/types.ts";

/** Which of a route's two views the URL is on: the Lab lives at `<docsPath>/lab`. */
export function useDesignSystemView(docsPath: string): DesignSystemView {
  return normalizePath(usePathname()) === `${docsPath}/lab` ? "lab" : "docs";
}
