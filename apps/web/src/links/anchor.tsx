"use client";

import { t } from "@tuja/i18n";
import { Anchor as UiAnchor } from "@tuja/ui/components/anchor";
import type { ComponentProps } from "react";
import { RouterLink, type RoutingProps } from "./router-link.tsx";

type AnchorProps = Omit<
  ComponentProps<typeof UiAnchor>,
  "linkComponent" | "newTabLabel"
> &
  RoutingProps;

/** `@tuja/ui`'s `Anchor`, routed through next/link, with translated copy. */
export function Anchor(props: AnchorProps) {
  return (
    <UiAnchor
      {...props}
      linkComponent={RouterLink}
      newTabLabel={t({ en: "(opens in new tab)", zh: "(在新标签页中打开)" })}
    />
  );
}
