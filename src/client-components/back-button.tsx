"use client";

import { CaretLeft, House } from "@phosphor-icons/react/dist/ssr";
import { useSearchParams } from "next/navigation";
import type { SupportedLocale } from "../types";
import { Anchor } from "../server-components/anchor";
import { getLocalePath, getPathWithSearch } from "../utils/pathname";

interface BackButtonProps {
  locale: SupportedLocale;
  label: string;
}

export function BackButton({ locale, label }: BackButtonProps) {
  const searchParams = useSearchParams();
  return (
    <Anchor
      href={getPathWithSearch(
        getLocalePath("/", locale),
        searchParams.toString()
      )}
      aria-label={label}
    >
      <CaretLeft weight="bold" />
      <House weight="bold" />
    </Anchor>
  );
}
