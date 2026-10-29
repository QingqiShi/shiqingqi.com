import { use } from "react";
import { LocaleContext } from "./locale-context.ts";

export function useLocale() {
  return use(LocaleContext);
}
