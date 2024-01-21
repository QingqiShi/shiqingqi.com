"use client";

import { CaretLeft, House } from "@phosphor-icons/react/dist/ssr";
import type { SupportedLocale } from "../types";
import { Anchor } from "../server-components/anchor";
import { getLocalePath } from "../utils/pathname";

interface BackButtonProps {
  locale: SupportedLocale;
  label: string;
}

export function BackButton({ locale, label }: BackButtonProps) {
  return (
    <Anchor href={getLocalePath("/", locale)} aria-label={label}>
      <CaretLeft weight="bold" />
      <House weight="bold" />
    </Anchor>
  );
}
