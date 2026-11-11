"use client";

import { Button } from "@tuja/ui/components/button";
import { justify } from "@tuja/ui/primitives/flex.stylex";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { use } from "react";
import { ChatActionsContext } from "./chat-actions-context";

interface SuggestionChipsProps {
  suggestions: ReadonlyArray<string>;
  groupLabel: string;
  onSelect?: (text: string) => void;
  /**
   * When true, all chips are rendered in a disabled state. Mirrors the
   * ChatTextarea `disabled` behavior so callers can signal "chat is busy —
   * don't queue another send" consistently across both inputs instead of
   * letting clicks silently no-op.
   */
  disabled?: boolean;
}

export function SuggestionChips({
  suggestions,
  groupLabel,
  onSelect,
  disabled,
}: SuggestionChipsProps) {
  const chatActions = use(ChatActionsContext);
  const handleSelect = onSelect ?? chatActions?.sendMessage;

  return (
    <div
      role="group"
      aria-label={groupLabel}
      css={[cluster.tight, justify.center]}
    >
      {suggestions.map((text) => (
        <Button
          key={text}
          look="outline"
          size="sm"
          onClick={() => handleSelect?.(text)}
          disabled={disabled}
        >
          {text}
        </Button>
      ))}
    </div>
  );
}
