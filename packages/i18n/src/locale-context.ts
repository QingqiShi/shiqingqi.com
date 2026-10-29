import { createContext } from "react";
import type { SupportedLocale } from "./types.ts";

export const LocaleContext = createContext<SupportedLocale>("en");
