"use client";

import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import Image from "next/image";
import type { ComponentProps } from "react";
import { useTranslations } from "@/hooks/use-translations";
import { cn } from "@/lib/utils";
import type { SupportedLocale } from "@/types";
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
          className={cn(
            "p-2 flex gap-2 items-center text-base",
            position === "viewportWidth" ? "" : "w-[50dvw] max-w-[500px]",
          )}
        >
          <div className="bg-[#0d253f] rounded-2xl p-2">
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
