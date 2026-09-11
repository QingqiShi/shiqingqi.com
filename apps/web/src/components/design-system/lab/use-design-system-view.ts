import { usePathname } from "next/navigation";
import { normalizePath } from "#src/utils/normalize-path.ts";
import type { DesignSystemView } from "../routes/types.ts";

/** Which of a route's two views the URL is on: the Lab lives at `<docsPath>/lab`. */
export function useDesignSystemView(docsPath: string): DesignSystemView {
  return normalizePath(usePathname()) === `${docsPath}/lab` ? "lab" : "docs";
}
