"use client";

import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { PromptField } from "@tuja/ui/components/prompt-field";

function ignore() {
  return undefined;
}

/**
 * An empty field with its send button. `PromptField` is controlled only, so
 * this client island gives it handlers that do nothing: the tile is inert.
 */
export function PromptFieldSpecimen() {
  return (
    <PromptField
      label={t({ en: "Ask a question", zh: "提问" })}
      placeholder={t({ en: "Ask...", zh: "提问..." })}
      value=""
      onValueChange={ignore}
      onSubmit={ignore}
      action={
        <Button
          size="sm"
          aria-label={t({ en: "Send", zh: "发送" })}
          icon={<ArrowUpIcon weight="bold" />}
        />
      }
    />
  );
}
