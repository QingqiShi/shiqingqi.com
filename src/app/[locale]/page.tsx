import * as x from "@stylexjs/stylex";
import { lazy } from "react";
import type { Breakpoints, PageProps } from "../../types";
import { getTranslations } from "../translations/getTranslations";
import { ExperienceCard } from "../../server-components/experience-card";
import translations from "./translations.json";

const CitadelLogo = lazy(() => import("../../logos/citadel-logo"));
const SpotifyLogo = lazy(() => import("../../logos/spotify-logo"));
const WtcLogo = lazy(() => import("../../logos/wtc-logo"));
const BristolLogo = lazy(() => import("../../logos/bristol-logo"));
const NottinghamLogo = lazy(() => import("../../logos/nottingham-logo"));

export async function generateStaticParams() {
  return [{ locale: "en" }, { locale: "zh" }];
}

export default function Home({ params }: PageProps) {
  const { t } = getTranslations(translations, params.locale);
  return (
    <>
      <section {...x.props(styles.headlineContainer)}>
        <h1 {...x.props(styles.headline)}>
          {t("headline_1")}
          <br />
          {t("headline_2")}
        </h1>
        <p {...x.props(styles.brief)}>{t("brief", { parse: true })}</p>
      </section>
      <section>
        <h2 {...x.props(styles.sectionTitle)}>{t("experiencesSection")}</h2>
        <div {...x.props(styles.cardList)}>
          <ExperienceCard
            logo={<CitadelLogo style={styles.svg} />}
            dates="blah"
            href="/"
            locale={params.locale}
            style={styles.card}
          />
          <ExperienceCard
            logo={<SpotifyLogo style={styles.svg} />}
            dates="blah"
            href="/"
            locale={params.locale}
            style={styles.card}
          />
          <ExperienceCard
            logo={<WtcLogo style={styles.svg} />}
            dates="blah"
            href="/"
            locale={params.locale}
            style={styles.card}
          />
        </div>
      </section>
      <section>
        <h2 {...x.props(styles.sectionTitle)}>{t("educationSection")}</h2>
        <div {...x.props(styles.cardList)}>
          <div>test</div>
        </div>
      </section>
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
  sectionTitle: {
    marginBottom: "1rem",
    fontSize: "1.2rem",
    fontWeight: 800,
  },
  cardList: {
    display: "flex",
    flexWrap: "wrap",
  },
  card: {
    width: { default: "100%", [sm]: "50%", [md]: "33.3%", [minLg]: "25%" },
  },
  svg: {
    height: { default: "5.5rem", [sm]: "4.4rem", [minMd]: "3rem" },
    maxWidth: "100%",
  },
});
