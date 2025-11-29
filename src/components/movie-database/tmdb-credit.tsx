"use client";

import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import * as stylex from "@stylexjs/stylex";
import Image from "next/image";
import type { ComponentProps } from "react";
import { useTranslations } from "#src/hooks/use-translations.ts";
import { border, font, space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { MenuButton } from "../shared/menu-button";
import type translations from "./translations.json";

interface TmdbCreditProps {
  locale: SupportedLocale;
  position: ComponentProps<typeof MenuButton>["position"];
}

export function TmdbCredit({ position }: TmdbCreditProps) {
  const { t } = useTranslations<typeof translations>("movieDatabase");
  return (
    <MenuButton
      position={position}
      buttonProps={{ icon: <InfoIcon /> }}
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
    maxInlineSize: 500,
    fontSize: font.uiBodySmall,
  },
  viewportContainer: {
    width: null,
    maxInlineSize: null,
  },
  imageContainer: {
    backgroundColor: "#0d253f",
    borderRadius: border.radius_2,
    padding: space._2,
  },
});
