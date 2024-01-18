import type { Metadata } from "next";
import { cookies } from "next/headers";
import * as x from "@stylexjs/stylex";
import { getTranslations } from "../translations/getTranslations";
import type { Breakpoints, LayoutProps, PageProps } from "../../types";
import { Header } from "../../server-components/header";
import { getDocumentClassName, globalStyles } from "../globalStyles";
import translations from "./translations.json";

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
        <link
          rel="preload"
          href="./InterVariable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
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

const sm: Breakpoints["sm"] = "@media (min-width: 320px)";
const md: Breakpoints["md"] = "@media (min-width: 768px)";
const lg: Breakpoints["lg"] = "@media (min-width: 1080px)";
const xl: Breakpoints["xl"] = "@media (min-width: 2000px)";

const styles = x.create({
  container: {
    maxWidth: { default: "1080px", [xl]: "calc((1080 / 24) * 1rem)" },
    marginVertical: 0,
    marginHorizontal: "auto",
    paddingVertical: 0,
    paddingRight: {
      default: "calc(1rem + env(safe-area-inset-right))",
      [sm]: "calc(1.2rem + env(safe-area-inset-right))",
      [md]: "calc(1.4rem + env(safe-area-inset-right))",
      [lg]: "calc(1.7rem + env(safe-area-inset-right))",
    },
    paddingLeft: {
      default: "calc(1rem + env(safe-area-inset-left))",
      [sm]: "calc(1.2rem + env(safe-area-inset-left))",
      [md]: "calc(1.4rem + env(safe-area-inset-left))",
      [lg]: "calc(1.7rem + env(safe-area-inset-left))",
    },
  },
  wrapperInner: {
    position: "relative",
  },
});
