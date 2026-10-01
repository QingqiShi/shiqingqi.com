"use client";

import { MarkdownContent } from "./markdown-content";
import { useSmoothedText } from "./use-smoothed-text";

interface SmoothedMarkdownContentProps {
  content: string;
  onCaughtUp?: () => void;
  sealed?: boolean;
  startRevealed?: boolean;
  trailingBufferHint?: number;
}

export function SmoothedMarkdownContent({
  content,
  onCaughtUp,
  sealed,
  startRevealed,
  trailingBufferHint,
}: SmoothedMarkdownContentProps) {
  const displayedText = useSmoothedText(content, {
    onCaughtUp,
    sealed,
    startRevealed,
    trailingBufferHint,
  });
  return <MarkdownContent content={displayedText} />;
}
