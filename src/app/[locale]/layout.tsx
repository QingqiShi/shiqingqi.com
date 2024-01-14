import type { Metadata } from "next";
import { cookies } from "next/headers";
import * as stylex from "@stylexjs/stylex";
import { getTranslations } from "../translations/getTranslations";
import translations from "./translations.json";
import { LayoutProps, PageProps } from "../../types";
import { Header } from "../../components/header";
import { systemTheme } from "../tokens.stylex";
import { getDocumentClassName, globalStyles } from "../globalStyles";
import "./global.css";

export async function generateMetadata({ params }: PageProps) {
  const { t } = getTranslations(translations, params.locale);
  return {
    title: {
      default: t("title"),
      template: t("titleTemplate"),
    },
    description: t("description"),
  } satisfies Metadata;
}

export default function RootLayout({ children, params }: LayoutProps) {
  const initialTheme = cookies().get("theme")?.value;
  return (
    <html lang={params.locale} className={getDocumentClassName(initialTheme)}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter&display=swap"
          rel="stylesheet"
        />
      </head>
      <body {...stylex.props(globalStyles.global, globalStyles.body)}>
        <Header params={params} />
        {children}
      </body>
    </html>
  );
}
