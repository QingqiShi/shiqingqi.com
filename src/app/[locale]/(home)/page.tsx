import * as stylex from "@stylexjs/stylex";
import { getTranslations } from "@/app/translations/getTranslations";
import { breakpoints } from "@/breakpoints";
import AGSB from "@/logos/AGSB.webp";
import BristolLogo from "@/logos/bristol-logo";
import CitadelLogo from "@/logos/citadel-logo";
import NottinghamLogo from "@/logos/nottingham-logo";
import SpotifyLogo from "@/logos/spotify-logo";
import WtcLogo from "@/logos/wtc-logo";
import { BackgroundLines } from "@/server-components/background-lines";
import { font, space } from "@/tokens.stylex";
import type { PageProps } from "@/types";
import { getLocalePath } from "@/utils/pathname";
import { EducationCard } from "./education-card";
import { ExperienceCard } from "./experience-card";
import translations from "./translations.json";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "zh" }];
}

export default async function Home(props: PageProps) {
  const params = await props.params;
  const { t } = getTranslations(translations, params.locale);
  return (
    <>
      <BackgroundLines />
      <section css={styles.headlineContainer}>
        <h1 css={styles.headline}>
          {t("headline_1")}
          <br />
          {t("headline_2")}
        </h1>
        <p css={styles.brief}>{t("brief", { parse: true })}</p>
      </section>
      <section>
        <h2 css={styles.sectionTitle}>{t("experiencesSection")}</h2>
        <div css={styles.cardList}>
          <ExperienceCard
            logo={<CitadelLogo />}
            dates={t("citadelDate")}
            href={getLocalePath("/experiences/citadel", params.locale)}
            locale={params.locale}
            css={styles.card}
            aria-label={t("citadelLabel")}
            scroll
          />
          <ExperienceCard
            logo={<SpotifyLogo />}
            dates={t("spotifyDate")}
            href={getLocalePath("/experiences/spotify", params.locale)}
            locale={params.locale}
            css={styles.card}
            aria-label={t("spotifyLabel")}
          />
          <ExperienceCard
            logo={<WtcLogo />}
            dates={t("wtcDate")}
            href={getLocalePath(
              "/experiences/wunderman-thompson-commerce",
              params.locale
            )}
            locale={params.locale}
            css={styles.card}
            aria-label={t("wtcLabel")}
          />
        </div>
      </section>
      <section>
        <h2 css={styles.sectionTitle}>{t("educationSection")}</h2>
        <div css={styles.cardList}>
          <EducationCard
            logo={<BristolLogo title={t("uob")} />}
            name={t("uob")}
            dates={t("uobDate")}
            href={
              params.locale === "en"
                ? "/education/university-of-bristol"
                : `/${params.locale}/education/university-of-bristol`
            }
            locale={params.locale}
            css={styles.card}
          />
          <EducationCard
            logo={<NottinghamLogo title={t("uon")} />}
            name={t("uon")}
            dates={t("uonDate")}
            href={
              params.locale === "en"
                ? "/education/university-of-nottingham"
                : `/${params.locale}/education/university-of-nottingham`
            }
            locale={params.locale}
            css={styles.card}
          />
          <EducationCard
            logo={{ src: AGSB, alt: t("agsb") }}
            name={t("agsb")}
            dates={t("agsbDate")}
            href={
              params.locale === "en"
                ? "/education/altrincham-grammar-school-for-boys"
                : `/${params.locale}/education/altrincham-grammar-school-for-boys`
            }
            locale={params.locale}
            css={styles.card}
          />
        </div>
      </section>
    </>
  );
}

const styles = stylex.create({
  headlineContainer: {
    padding: {
      default: `0 0 ${space._7}`,
      [breakpoints.sm]: `0 0 ${space._9}`,
    },
  },
  headline: {
    margin: `0 0 ${space._3} 0`,
    fontSize: {
      default: font.size_5,
      [breakpoints.sm]: font.size_6,
      [breakpoints.md]: font.size_7,
      [breakpoints.lg]: font.size_8,
    },
    fontWeight: font.weight_8,
  },
  brief: {
    margin: 0,
  },
  sectionTitle: {
    marginTop: space._7,
    marginBottom: space._3,
    fontSize: font.size_3,
    fontWeight: font.weight_7,
  },
  cardList: {
    display: "flex",
    flexWrap: "wrap",
  },
  card: {
    width: {
      default: "100%",
      [breakpoints.sm]: "50%",
      [breakpoints.md]: "33.3%",
      [breakpoints.lg]: "25%",
    },
  },
  // experienceSvg: {
  //   height: {
  //     default: "5.5rem",
  //     [breakpoints.sm]: "4.4rem",
  //     [breakpoints.md]: "3rem",
  //   },
  //   maxWidth: "100%",
  //   transition: "fill .2s",
  // },
  // educationSvg: {
  //   height: "100%",
  //   maxWidth: "100%",
  //   transition: "fill .2s",
  // },
});
