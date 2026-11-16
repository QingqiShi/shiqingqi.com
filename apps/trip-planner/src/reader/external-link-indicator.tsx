"use client";

import { ExternalLinkIndicator as UiExternalLinkIndicator } from "@tuja/ui/components/external-link-indicator";
import { useNewTabLabel } from "./use-new-tab-label.ts";

/** Marks a link that opens in a new tab, for the eye and for a screen reader. */
export function ExternalLinkIndicator() {
  return <UiExternalLinkIndicator label={useNewTabLabel()} />;
}
