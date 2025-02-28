"use client";

import { CaretLeft } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { House } from "@phosphor-icons/react/dist/ssr/House";
import * as stylex from "@stylexjs/stylex";
import { usePathname } from "next/navigation";
import { breakpoints } from "@/breakpoints";
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
  const targetPath = getLocalePath(
    urlParts.length === 1
      ? "/"
      : `/${urlParts.slice(0, urlParts.length - 1).join("/")}`,
    locale
  );

  return (
    <AnchorButton
      icon={<CaretLeft weight="bold" role="presentation" />}
      href={targetPath}
      aria-label={label}
    >
      <span css={styles.desktopVisible}>{label}</span>
      <House weight="bold" role="presentation" css={styles.mobileVisible} />
    </AnchorButton>
  );
}

const styles = stylex.create({
  desktopVisible: {
    display: {
      default: "none",
      [breakpoints.md]: "inline-flex",
    },
  },
  mobileVisible: {
    display: { default: "inline-flex", [breakpoints.md]: "none" },
  },
});
