import * as x from "@stylexjs/stylex";
import type { Breakpoints, PageProps } from "../../types";
import { getTranslations } from "../translations/getTranslations";
import translations from "./translations.json";

export async function generateStaticParams() {
  return [{ locale: "en" }, { locale: "zh" }];
}

export default function Home({ params }: PageProps) {
  const { t } = getTranslations(translations, params.locale);
  return (
    <>
      <div {...x.props(styles.headlineContainer)}>
        <h1 {...x.props(styles.headline)}>
          {t("headline_1")}
          <br />
          {t("headline_2")}
        </h1>
        <p {...x.props(styles.brief)}>{t("brief", { parse: true })}</p>
      </div>
    </>
  );
}

const sm: Breakpoints["sm"] =
  "@media (min-width: 320px) and (max-width: 767px)";
const md: Breakpoints["md"] =
  "@media (min-width: 768px) and (max-width: 1079px)";
const minMd: Breakpoints["minMd"] = "@media (min-width: 768px)";
const minLg: Breakpoints["minLg"] = "@media (min-width: 1080px)";

const styles = x.create({
  headlineContainer: {
    padding: { default: "0 0 3rem", [sm]: "0 0 5rem", [minMd]: "0 0 7rem" },
  },
  headline: {
    margin: "0 0 1rem 0",
    fontSize: {
      default: "2rem",
      [sm]: "2.5rem",
      [md]: "3rem",
      [minLg]: "3.5rem",
    },
    fontWeight: 800,
  },
  brief: {
    margin: 0,
  },
});
