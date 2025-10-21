"use client";

import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { useTranslations } from "@/hooks/use-translations";
import { cn } from "@/lib/utils";
import { Anchor } from "./anchor";
import type translations from "./card.translations.json";

type CardProps = React.ComponentProps<typeof Anchor>;

export function Card({ children, className, ...rest }: CardProps) {
  const { t } = useTranslations<typeof translations>("card");
  return (
    <Anchor
      {...rest}
      className={cn(
        // Base styles
        "block w-full no-underline",
        "text-base rounded-md text-left p-4",
        "overflow-hidden cursor-pointer relative",
        "text-gray-12 dark:text-grayDark-12",

        // Transitions
        "transition-all duration-200",

        // Hover effects
        "hover:shadow-2xl hover:z-content",
        "hover:bg-gray-1/10 dark:hover:bg-grayDark-1/10",
        "hover:scale-105 hover:-translate-y-1",
        "hover:backdrop-blur-[2rem]",

        // Custom properties for children (details indicator & image filter)
        "[--card-details-opacity:0] hover:[--card-details-opacity:1]",
        "[--card-details-transform:translate3d(0,0.5rem,0)] hover:[--card-details-transform:translate3d(0,0,0)]",
        "[--card-image-filter:grayscale(100%)] hover:[--card-image-filter:grayscale(0%)]",

        className,
      )}
    >
      {children}

      {/* Details backdrop gradient */}
      <div
        className={cn(
          "absolute top-0 right-0 pointer-events-none",
          "h-20 w-40",
          "transition-opacity duration-200",
          "opacity-[var(--card-details-opacity)]",
        )}
        style={{
          backgroundImage: `linear-gradient(
            to bottom left,
            rgb(255 255 255 / 0.7) 0%,
            rgb(255 255 255 / 0.691) 4.05%,
            rgb(255 255 255 / 0.666) 7.75%,
            rgb(255 255 255 / 0.627) 11.2%,
            rgb(255 255 255 / 0.577) 14.45%,
            rgb(255 255 255 / 0.519) 17.5%,
            rgb(255 255 255 / 0.454) 20.5%,
            rgb(255 255 255 / 0.385) 23.35%,
            rgb(255 255 255 / 0.315) 26.25%,
            rgb(255 255 255 / 0.246) 29.15%,
            rgb(255 255 255 / 0.181) 32.15%,
            rgb(255 255 255 / 0.123) 35.25%,
            rgb(255 255 255 / 0.073) 38.55%,
            rgb(255 255 255 / 0.034) 42.1%,
            rgb(255 255 255 / 0.009) 45.9%,
            rgb(255 255 255 / 0) 50%
          )`,
        }}
      />

      {/* Details indicator */}
      <div
        className={cn(
          "absolute right-2 top-2 z-content",
          "flex items-center gap-1",
          "text-xs pointer-events-none",
          "text-gray-12 dark:text-grayDark-12",
          "transition-all duration-200",
          "opacity-[var(--card-details-opacity)]",
          "translate-x-[var(--card-details-transform)]",
        )}
      >
        <span className="font-semibold">{t("details")}</span>
        <ArrowRightIcon />
      </div>
    </Anchor>
  );
}
