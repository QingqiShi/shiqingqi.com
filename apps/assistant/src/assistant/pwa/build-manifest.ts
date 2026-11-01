import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import type { MetadataRoute } from "next";
import { CANVAS_COLORS } from "#src/theme/canvas-colors.ts";
import icon192 from "./assistant-icon-192.png";
import icon512 from "./assistant-icon-512.png";

const COPY = {
  en: {
    name: "Mail Assistant",
    shortName: "Assistant",
    description:
      "Your inbox filed into folders, and a morning report of what needs you.",
  },
  zh: {
    name: "邮件助手",
    shortName: "邮件助手",
    description: "替你把收件箱归入文件夹，每天早上一份晨报，告诉你要处理什么。",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

export function buildManifest(locale: SupportedLocale): MetadataRoute.Manifest {
  return {
    id: "/",
    name: COPY[locale].name,
    short_name: COPY[locale].shortName,
    description: COPY[locale].description,
    lang: locale,
    start_url: getLocalePath("/", locale),
    // The Language preference moves between `/` and `/zh`.
    // A narrower scope opens the other language outside the app.
    scope: "/",
    display: "standalone",
    background_color: CANVAS_COLORS.light,
    theme_color: CANVAS_COLORS.light,
    icons: [
      { src: icon192.src, sizes: "192x192", type: "image/png" },
      { src: icon512.src, sizes: "512x512", type: "image/png" },
    ],
  };
}
