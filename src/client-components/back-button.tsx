"use client";

import { CaretLeft, House } from "@phosphor-icons/react/dist/ssr";
import * as stylex from "@stylexjs/stylex";
import { usePathname } from "next/navigation";
import { AnchorButton } from "@/server-components/anchor-button";
import type { Breakpoints, SupportedLocale } from "@/types";
import { getLocalePath, normalizePath } from "@/utils/pathname";

interface BackButtonProps {
  locale: SupportedLocale;
  label: string;
}

export function BackButton({ locale, label }: BackButtonProps) {
  const pathname = usePathname();

  if (normalizePath(pathname) === "/") {
    return null;
  }

  const targetPath = getLocalePath("/", locale);
  return (
    <>
      <AnchorButton
        icon={<CaretLeft weight="bold" role="presentation" />}
        href={targetPath}
        aria-label={label}
        style={styles.desktopVisible}
      >
        {label}
      </AnchorButton>
      <AnchorButton
        href={targetPath}
        aria-label={label}
        style={styles.mobileVisible}
      >
        <CaretLeft weight="bold" role="presentation" />
        <House weight="bold" role="presentation" />
      </AnchorButton>
    </>
  );
}

const minMd: Breakpoints["minMd"] = "@media (min-width: 768px)";

const styles = stylex.create({
  desktopVisible: {
    display: { default: "none", [minMd]: "inline-flex" },
  },
  mobileVisible: {
    display: { default: "inline-flex", [minMd]: "none" },
  },
});
