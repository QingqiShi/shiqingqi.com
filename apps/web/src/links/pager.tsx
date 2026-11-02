"use client";

import { Pager as UiPager } from "@tuja/ui/components/pager";
import type { ComponentProps } from "react";
import { RouterLink } from "./router-link.tsx";

type PagerProps = ComponentProps<typeof UiPager>;

/** `@tuja/ui`'s `Pager`, routed through next/link. */
export function Pager(props: PagerProps) {
  return <UiPager {...props} linkComponent={RouterLink} />;
}
