import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@/breakpoints.stylex";
import { DetailPageTitle } from "@/components/home/detail-page-title";
import SpotifyLogo from "@/logos/spotify-logo";
import { color, font, space } from "@/tokens.stylex";
import type { PageProps } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import translations from "./translations.json";

export default async function Page(props: PageProps) {
  const params = await props.params;
  const { t } = getTranslations(translations, params.locale);
  return (
    <>
      <DetailPageTitle
        type="experience"
        title="Spotify"
        role={t("role")}
        date={t("date")}
        locale={params.locale}
        logo={<SpotifyLogo />}
      />
      <div css={styles.container}>
        <section css={styles.fullWidthSection}>
          <p css={styles.text}>{t("mainJob")}</p>
        </section>

        <section css={styles.fullWidthSection}>
          <p css={styles.text}>{t("dependabot")}</p>
        </section>

        <section css={styles.fullWidthSection}>
          <p css={styles.text}>{t("companyWide")}</p>
        </section>
      </div>
    </>
  );
}

const styles = stylex.create({
  container: {
    display: "grid",
    gap: {
      default: space._6,
      [breakpoints.md]: space._8,
    },
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(2, 1fr)",
      [breakpoints.lg]: "repeat(3, 1fr)",
    },
  },
  fullWidthSection: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    gridColumn: {
      default: "1",
      [breakpoints.md]: "1 / -1",
    },
  },
  text: {
    color: color.textMuted,
    fontSize: font.size_1,
    lineHeight: font.lineHeight_4,
    margin: 0,
  },
});
