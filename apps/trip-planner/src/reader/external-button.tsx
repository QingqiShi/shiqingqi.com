"use client";

import { Button } from "@tuja/ui/components/button";
import type { ReactNode } from "react";
import { ExternalLinkIndicator } from "./external-link-indicator.tsx";

/** A small `Button` link to another site, in a new tab. */
export function ExternalButton({
  href,
  icon,
  look,
  children,
}: {
  href: string;
  icon: ReactNode;
  look: "outline" | "ghost";
  children: ReactNode;
}) {
  return (
    <Button
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      look={look}
      size="sm"
      icon={icon}
      trailing={<ExternalLinkIndicator />}
    >
      {children}
    </Button>
  );
}
