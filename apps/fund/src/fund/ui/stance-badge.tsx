"use client";

import { HandshakeIcon } from "@phosphor-icons/react/dist/ssr/Handshake";
import { ProhibitIcon } from "@phosphor-icons/react/dist/ssr/Prohibit";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { TargetIcon } from "@phosphor-icons/react/dist/ssr/Target";
import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import type { ReactNode } from "react";
import type { RiskFactor } from "../contracts/risk-policy-schema.ts";

const STANCE_INTENT = {
  seek: "primary",
  accept: "info",
  limit: "warning",
  avoid: "destructive",
} as const;

const STANCE_ICON: Record<RiskFactor["stance"], ReactNode> = {
  seek: <TargetIcon weight="bold" />,
  accept: <HandshakeIcon weight="bold" />,
  limit: <SlidersHorizontalIcon weight="bold" />,
  avoid: <ProhibitIcon weight="bold" />,
};

/** The stance on one risk, as a badge that leads its card. */
export function StanceBadge({ stance }: { stance: RiskFactor["stance"] }) {
  const names: Record<RiskFactor["stance"], string> = {
    seek: t({ en: "Seek", zh: "主动承担" }),
    accept: t({ en: "Accept", zh: "接受" }),
    limit: t({ en: "Limit", zh: "限制" }),
    avoid: t({ en: "Avoid", zh: "回避" }),
  };
  return (
    <Badge intent={STANCE_INTENT[stance]} icon={STANCE_ICON[stance]}>
      {names[stance]}
    </Badge>
  );
}
