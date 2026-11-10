"use client";

import { Link } from "@tuja/next-links/link";
import {
  NavigationSplitView,
  type SplitViewBackLink,
} from "@tuja/ui/components/navigation-split-view";
import type { StyleProp } from "@tuja/ui/types";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * A page of one pane with a way back above its title, the same back link
 * that a settings section and a report show on a phone. The link goes back
 * in history when the page came from `back`, and else replaces the page with
 * it, so that Back does not return here.
 */
export function PageWithBack({
  label,
  back,
  css,
  children,
}: {
  label: string;
  back: SplitViewBackLink;
  css?: StyleProp;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <NavigationSplitView
      linkComponent={Link}
      css={css}
      replace={(href) => {
        router.replace(href);
      }}
      content={{ label, back, node: children }}
    />
  );
}
