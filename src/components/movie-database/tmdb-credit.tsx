"use client";

import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import * as stylex from "@stylexjs/stylex";
import Image from "next/image";
import type { ComponentProps } from "react";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { border, font, space } from "#src/tokens.stylex.ts";
import { MenuButton } from "../shared/menu-button";

interface TmdbCreditProps {
  position: ComponentProps<typeof MenuButton>["position"];
}

export function TmdbCredit({ position }: TmdbCreditProps) {
  return (
    <MenuButton
      position={position}
      buttonProps={{
        icon: <InfoIcon />,
        "aria-label": t({ en: "TMDB attribution info", zh: "TMDB 版权信息" }),
      }}
      menuContent={
        <div
          css={[
            flex.row,
            styles.container,
            position === "viewportWidth" && styles.viewportContainer,
          ]}
        >
          <div css={styles.imageContainer}>
            <Image
              src="/tmdb.svg"
              alt={t({ en: "TMDB Logo", zh: "TMDB Logo" })}
              width={100}
              height={50}
            />
          </div>
          <span>
            {t({
              en: "This product uses the TMDB API but is not endorsed or certified by TMDB.",
              zh: "本产品使用了 TMDB 提供的 API，但并未获得 TMDB 的官方认可或认证。",
            })}
          </span>
        </div>
      }
    />
  );
}

const styles = stylex.create({
  container: {
    padding: space._2,
    gap: space._2,
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
