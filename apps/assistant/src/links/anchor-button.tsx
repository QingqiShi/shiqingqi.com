"use client";

import { AnchorButton as UiAnchorButton } from "@tuja/ui/components/anchor-button";
import type { ComponentProps } from "react";
import { RouterLink, type RoutingProps } from "./router-link.tsx";

type AnchorButtonProps = ComponentProps<typeof UiAnchorButton> & RoutingProps;

/** `@tuja/ui`'s `AnchorButton`, routed through next/link. */
export function AnchorButton(props: AnchorButtonProps) {
  return <UiAnchorButton {...props} linkComponent={RouterLink} />;
}
