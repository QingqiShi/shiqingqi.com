"use client";

import { t } from "@tuja/i18n";
import { RouterLink, type RoutingProps } from "@tuja/next-links/router-link";
import { Anchor as UiAnchor } from "@tuja/ui/components/anchor";
import type { ComponentProps } from "react";

type AnchorProps = Omit<ComponentProps<typeof UiAnchor>, "newTabLabel"> &
  RoutingProps;

/** `@tuja/ui`'s `Anchor`, routed through next/link unless `linkComponent` says otherwise, with translated copy. */
export function Anchor({ linkComponent = RouterLink, ...props }: AnchorProps) {
  return (
    <UiAnchor
      {...props}
      linkComponent={linkComponent}
      newTabLabel={t({ en: "(opens in new tab)", zh: "(在新标签页中打开)" })}
    />
  );
}
