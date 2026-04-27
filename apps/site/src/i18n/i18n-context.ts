import { createContext } from "react";

export const I18nContext = createContext<{
  translations: Record<string, string>;
}>({ translations: {} });
