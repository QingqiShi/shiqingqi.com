import * as stylex from "@stylexjs/stylex";
import type { Breakpoints, PageProps } from "../../types";
import { getTranslations } from "../translations/getTranslations";
import { ExperienceCard } from "../../server-components/experience-card";
import { EducationCard } from "../../server-components/education-card";
import CitadelLogo from "../../logos/citadel-logo";
import SpotifyLogo from "../../logos/spotify-logo";
import WtcLogo from "../../logos/wtc-logo";
import BristolLogo from "../../logos/bristol-logo";
import AGSB from "../../logos/AGSB.webp";
import NottinghamLogo from "../../logos/nottingham-logo";
import translations from "./translations.json";

export async function generateStaticParams() {
  return [{ locale: "en" }, { locale: "zh" }];
}

export default function Home({ params }: PageProps) {
  const { t } = getTranslations(translations, params.locale);
  return (
    <>
      <section {...stylex.props(styles.headlineContainer)}>
        <h1 {...stylex.props(styles.headline)}>
          {t("headline_1")}
          <br />
          {t("headline_2")}
        </h1>
        <p {...stylex.props(styles.brief)}>{t("brief", { parse: true })}</p>
      </section>
      <section>
        <h2 {...stylex.props(styles.sectionTitle)}>
          {t("experiencesSection")}
        </h2>
        <div {...stylex.props(styles.cardList)}>
          <ExperienceCard
            logo={<CitadelLogo style={styles.experienceSvg} />}
            dates={t("citadelDate")}
            href="/"
            locale={params.locale}
            style={styles.card}
            aria-label={t("citadelLabel")}
          />
          <ExperienceCard
            logo={<SpotifyLogo style={styles.experienceSvg} />}
            dates={t("spotifyDate")}
            href="/"
            locale={params.locale}
            style={styles.card}
            aria-label={t("spotifyLabel")}
          />
          <ExperienceCard
            logo={<WtcLogo />}
            dates={t("wtcDate")}
            href="/"
            locale={params.locale}
            style={styles.card}
            aria-label={t("wtcLabel")}
          />
        </div>
      </section>
      <section>
        <h2 {...stylex.props(styles.sectionTitle)}>{t("educationSection")}</h2>
        <div {...stylex.props(styles.cardList)}>
          <EducationCard
            logo={<BristolLogo title={t("uob")} style={styles.educationSvg} />}
            name={t("uob")}
            dates={t("uobDate")}
            href="/"
            locale={params.locale}
            style={styles.card}
          />
          <EducationCard
            logo={
              <NottinghamLogo title={t("uon")} style={styles.educationSvg} />
            }
            name={t("uon")}
            dates={t("uonDate")}
            href="/"
            locale={params.locale}
            style={styles.card}
          />
          <EducationCard
            logo={{ src: AGSB, alt: t("agsb") }}
            name={t("agsb")}
            dates={t("agsbDate")}
            href="/"
            locale={params.locale}
            style={styles.card}
          />
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

const styles = stylex.create({
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
  experienceSvg: {
    height: { default: "5.5rem", [sm]: "4.4rem", [minMd]: "3rem" },
    maxWidth: "100%",
    transition: "fill .2s",
  },
  educationSvg: {
    transition: "fill .2s",
  },
});
