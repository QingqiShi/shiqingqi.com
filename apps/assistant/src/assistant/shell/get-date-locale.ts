import type { SupportedLocale } from "@tuja/i18n/types";
import { headers } from "next/headers";
import { cache } from "react";
import "server-only";
import { regionalEnglishOf, resolveDateLocale } from "./resolve-date-locale.ts";

/** The regional English of the browser that made this request, such as `en-US`, or null. */
export const getRegionalEnglish = cache(async (): Promise<string | null> =>
  regionalEnglishOf((await headers()).get("accept-language")),
);

/** The locale that a server component writes dates and times in. */
export async function getDateLocale(locale: SupportedLocale): Promise<string> {
  return resolveDateLocale(locale, await getRegionalEnglish());
}
