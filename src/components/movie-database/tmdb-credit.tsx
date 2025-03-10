import { Info } from "@phosphor-icons/react/dist/ssr/Info";
import * as stylex from "@stylexjs/stylex";
import Image from "next/image";
import type { ComponentProps } from "react";
import { border, font, space } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import { MenuButton } from "../shared/menu-button";
import translations from "./translations.json";

interface TmdbCreditProps {
  locale: SupportedLocale;
  position: ComponentProps<typeof MenuButton>["position"];
}

export function TmdbCredit({ locale, position }: TmdbCreditProps) {
  const { t } = getTranslations(translations, locale);
  return (
    <MenuButton
      position={position}
      buttonProps={{ icon: <Info /> }}
      menuContent={
        <div
          css={[
            styles.container,
            position === "viewportWidth" && styles.viewportContainer,
          ]}
        >
          <div css={styles.imageContainer}>
            <Image
              src="/tmdb.svg"
              alt={t("tmdbLogo")}
              width={100}
              height={50}
            />
          </div>
          <span>{t("tmdbCredits")}</span>
        </div>
      }
    />
  );
}

const styles = stylex.create({
  container: {
    padding: space._2,
    display: "flex",
    gap: space._2,
    alignItems: "center",
    width: "50dvw",
    maxWidth: 500,
    fontSize: font.size_0,
  },
  viewportContainer: {
    width: null,
    maxWidth: null,
  },
  imageContainer: {
    backgroundColor: "#0d253f",
    borderRadius: border.radius_2,
    padding: space._2,
  },
});
