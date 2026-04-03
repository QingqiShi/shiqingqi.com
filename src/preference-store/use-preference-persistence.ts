"use client";

import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { useEffect, useRef } from "react";
import { savePreferenceInputSchema } from "#src/ai-chat/tools/save-preference.ts";
import { loadPreferencesContext, mergePreferences } from "./preference-store";

/**
 * Observes chat messages for `save_preference` tool calls and persists
 * detected preferences to IndexedDB. Each tool call ID is processed at most
 * once.
 */
export function usePreferencePersistence(
  messages: ReadonlyArray<UIMessage>,
): void {
  const processedRef = useRef(new Set<string>());

  useEffect(() => {
    const processed = processedRef.current;

    for (const message of messages) {
      if (message.role !== "assistant") continue;

      for (const part of message.parts) {
        if (!isToolUIPart(part)) continue;
        if (getToolName(part) !== "save_preference") continue;
        if (part.state !== "output-available") continue;
        if (processed.has(part.toolCallId)) continue;

        processed.add(part.toolCallId);

        const parsed = savePreferenceInputSchema.safeParse(part.input);
        if (!parsed.success) continue;

        mergePreferences(parsed.data.preferences)
          .then(() => loadPreferencesContext())
          .catch(() => {
            // IndexedDB write failed — preference is lost but non-critical
          });
      }
    }
  }, [messages]);
}
