"use client";

import { t } from "@tuja/i18n";
import { ExternalLinkIndicator as UiExternalLinkIndicator } from "@tuja/ui/components/external-link-indicator";

/** `@tuja/ui`'s `ExternalLinkIndicator`, with translated copy. */
export function ExternalLinkIndicator() {
  return (
    <UiExternalLinkIndicator
      label={t({ en: "(opens in new tab)", zh: "(在新标签页中打开)" })}
    />
  );
}
