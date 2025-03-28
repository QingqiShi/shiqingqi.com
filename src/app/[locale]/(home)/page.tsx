import { FilmSlate } from "@phosphor-icons/react/dist/ssr/FilmSlate";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@/breakpoints";
import { BackgroundLines } from "@/components/home/background-lines";
import { EducationCard } from "@/components/home/education-card";
import { ExperienceCard } from "@/components/home/experience-card";
import { ProjectCard } from "@/components/home/project-card";
import cardTranslations from "@/components/shared/card.translations.json";
import { TranslationProvider } from "@/components/shared/translation-provider";
import AGSB from "@/logos/AGSB.webp";
import BristolLogo from "@/logos/bristol-logo";
import CitadelLogo from "@/logos/citadel-logo";
import NottinghamLogo from "@/logos/nottingham-logo";
import SpotifyLogo from "@/logos/spotify-logo";
import { svgTokens } from "@/logos/svg.stylex";
import WtcLogo from "@/logos/wtc-logo";
import { color, font, space } from "@/tokens.stylex";
import type { PageProps } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import { getLocalePath } from "@/utils/pathname";
import translations from "./translations.json";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "zh" }];
}

export default async function Home(props: PageProps) {
  const { locale } = await props.params;
  const { t } = getTranslations(translations, locale);
  return (
    <TranslationProvider
      locale={locale}
      translations={{ card: cardTranslations }}
    >
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
        <h2 css={styles.sectionTitle}>{t("projectSection")}</h2>
        <div css={styles.cardList}>
          <ProjectCard
            icon={<FilmSlate size={64} weight="fill" />}
            href={getLocalePath("/movie-database", locale)}
            css={[styles.card, styles.movieDatabase]}
            name={t("movieDatabase")}
            description={t("movieDatabaseDescription")}
            scroll
          />
        </div>
      </section>

      <section>
        <h2 css={styles.sectionTitle}>{t("experiencesSection")}</h2>
        <div css={styles.cardList}>
          <ExperienceCard
            logo={<CitadelLogo />}
            dates={t("citadelDate")}
            href={getLocalePath("/experiences/citadel", locale)}
            css={styles.card}
            aria-label={t("citadelLabel")}
            scroll
          />
          <ExperienceCard
            logo={<SpotifyLogo />}
            dates={t("spotifyDate")}
            href={getLocalePath("/experiences/spotify", locale)}
            css={styles.card}
            aria-label={t("spotifyLabel")}
          />
          <ExperienceCard
            logo={<WtcLogo />}
            dates={t("wtcDate")}
            href={getLocalePath(
              "/experiences/wunderman-thompson-commerce",
              locale
            )}
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
            href={getLocalePath("/education/university-of-bristol", locale)}
            css={styles.card}
          />
          <EducationCard
            logo={<NottinghamLogo title={t("uon")} />}
            name={t("uon")}
            dates={t("uonDate")}
            href={getLocalePath("/education/university-of-nottingham", locale)}
            css={styles.card}
          />
          <EducationCard
            logo={{ src: AGSB, alt: t("agsb") }}
            name={t("agsb")}
            dates={t("agsbDate")}
            href={getLocalePath(
              "/education/altrincham-grammar-school-for-boys",
              locale
            )}
            css={styles.card}
          />
        </div>
      </section>
    </TranslationProvider>
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
  movieDatabase: {
    [svgTokens.fill]: color.brandTmdb,
  },
});
