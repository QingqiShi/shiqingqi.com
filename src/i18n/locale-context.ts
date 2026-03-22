import { createContext } from "react";
import type { SupportedLocale } from "#src/types.ts";

export const LocaleContext = createContext<SupportedLocale>("en");
