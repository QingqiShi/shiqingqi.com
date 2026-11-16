"use client";

import { CarIcon } from "@phosphor-icons/react/dist/ssr/Car";
import { GasPumpIcon } from "@phosphor-icons/react/dist/ssr/GasPump";
import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { LetterCirclePIcon } from "@phosphor-icons/react/dist/ssr/LetterCircleP";
import { MoneyIcon } from "@phosphor-icons/react/dist/ssr/Money";
import { TrainSimpleIcon } from "@phosphor-icons/react/dist/ssr/TrainSimple";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { Callout } from "@tuja/ui/components/callout";
import type { ReactNode } from "react";
import type { TipKind } from "#src/trips/types.ts";
import type { Tip } from "#src/trips/types.ts";
import { TripText } from "./trip-text.tsx";

/** A heads-up. Only a warning takes the warning colour, so that it stands out. */
export function TipCallout({ tip }: { tip: Tip }) {
  return (
    <Callout
      intent={tip.kind === "warn" ? "warning" : "neutral"}
      icon={tipIcon[tip.kind]}
    >
      <TripText>{tip.text}</TripText>
    </Callout>
  );
}

const tipIcon: Record<TipKind, ReactNode> = {
  parking: <LetterCirclePIcon weight="bold" />,
  fuel: <GasPumpIcon weight="bold" />,
  drive: <CarIcon weight="bold" />,
  transit: <TrainSimpleIcon weight="bold" />,
  money: <MoneyIcon weight="bold" />,
  warn: <WarningIcon weight="bold" />,
  info: <InfoIcon weight="bold" />,
};
