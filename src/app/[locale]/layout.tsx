import type { Metadata } from "next";
import { cookies } from "next/headers";
import * as x from "@stylexjs/stylex";
import { getTranslations } from "../translations/getTranslations";
import translations from "./translations.json";
import { Breakpoints, LayoutProps, PageProps } from "../../types";
import { Header } from "../../server-components/header";
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
      <body {...x.props(globalStyles.global, globalStyles.body)}>
        <div {...x.props(styles.container)}>
          <div {...x.props(styles.wrapperInner)}>
            <Header params={params} />
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}

const xl: Breakpoints["xl"] = "@media (min-width: 2000px)";

const styles = x.create({
  container: {
    maxWidth: { default: "1080px", [xl]: "calc((1080 / 24) * 1rem)" },
    marginVertical: 0,
    marginHorizontal: "auto",
    paddingVertical: 0,
    paddingLeft: "calc(1rem + env(safe-area-inset-left))",
    paddingRight: "calc(1rem + env(safe-area-inset-right))",
  },
  wrapperInner: {
    position: "relative",
  },
});
