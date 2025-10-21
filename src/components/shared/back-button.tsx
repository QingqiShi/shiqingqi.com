"use client";

import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { usePathname } from "next/navigation";
import { AnchorButton } from "@/components/shared/anchor-button";
import type { SupportedLocale } from "@/types";
import { getLocalePath, normalizePath } from "@/utils/pathname";

const ignoredSegments = new Set(["experiences", "education"]);

interface BackButtonProps {
  locale: SupportedLocale;
  label: string;
}

export function BackButton({ locale, label }: BackButtonProps) {
  const pathname = usePathname();
  const normalizedPath = normalizePath(pathname);

  if (normalizedPath === "/") {
    return null;
  }

  const urlParts = normalizedPath
    .split("/")
    .filter((segment) => segment && !ignoredSegments.has(segment));

  // Special handling for movie-database detail pages
  if (urlParts.length >= 3 && urlParts[0] === "movie-database") {
    const mediaType = urlParts[1]; // "movie" or "tv"
    if (mediaType === "movie" || mediaType === "tv") {
      // Go back to list with appropriate type param
      const targetPath =
        mediaType === "tv"
          ? getLocalePath("/movie-database?type=tv", locale)
          : getLocalePath("/movie-database", locale);
      return (
        <AnchorButton
          icon={<CaretLeftIcon weight="bold" role="presentation" />}
          href={targetPath}
          aria-label={label}
        >
          <span className="hidden md:inline-flex">{label}</span>
          <HouseIcon
            weight="bold"
            role="presentation"
            className="inline-flex md:hidden"
          />
        </AnchorButton>
      );
    }
  }

  const targetPath = getLocalePath(
    urlParts.length === 1
      ? "/"
      : `/${urlParts.slice(0, urlParts.length - 1).join("/")}`,
    locale,
  );

  return (
    <AnchorButton
      icon={<CaretLeftIcon weight="bold" role="presentation" />}
      href={targetPath}
      aria-label={label}
    >
      <span className="hidden md:inline-flex">{label}</span>
      <HouseIcon
        weight="bold"
        role="presentation"
        className="inline-flex md:hidden"
      />
    </AnchorButton>
  );
}
