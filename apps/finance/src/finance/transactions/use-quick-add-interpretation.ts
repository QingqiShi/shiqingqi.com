import { useEffect, useRef, useState } from "react";
import type { QuickAddResponse } from "../ai/types.ts";
import { bankApiClient } from "../bank/bank-api-client.ts";
import { useEditorData } from "../editor/use-editor-data.ts";
import { FinanceApiError } from "../http/finance-api-error.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { useSyncStatus } from "../replica/use-sync-status.ts";
import {
  interpretQuickAdd,
  type QuickAddAnswer,
  type QuickAddInterpretation,
} from "./interpret-quick-add.ts";

const DEBOUNCE_MS = 400;
const TIMEOUT_MS = 3000;

export interface QuickAddInterpretationState {
  /**
   * What the line means, or null for an empty line. While a new reading is
   * on its way, it is still the reading of the text before.
   */
  interpretation: QuickAddInterpretation | null;
  /** The interpretation reads the text as it is now. */
  isCurrent: boolean;
  /** Asks the AI at once, without the wait for more typing. */
  interpretNow: () => void;
}

/**
 * Reads a quick-add line: the AI reads it a moment after the typing stops,
 * and the rules read it at once when the AI cannot help. The rules read a
 * line without words, a line typed offline or in the demo, and a line the
 * AI fails on, does not answer in time, or has no model for.
 */
export function useQuickAddInterpretation(
  text: string,
): QuickAddInterpretationState {
  const data = useEditorData();
  const { online } = useSyncStatus();
  const { readOnly } = useFinanceRuntime();
  const [answer, setAnswer] = useState<QuickAddAnswer>({
    id: 0,
    text: "",
    reply: null,
    isFallback: false,
  });
  const [hasNoModel, setHasNoModel] = useState(false);
  const sendNowRef = useRef<(() => void) | null>(null);

  const isEmpty = text.trim() === "";
  const canAskAi = online && !readOnly && !hasNoModel;
  const asksAi = canAskAi && /\p{L}/u.test(text);

  if (isEmpty ? answer.text !== "" : !asksAi && answer.text !== text) {
    setAnswer({
      id: answer.id + 1,
      text: isEmpty ? "" : text,
      reply: null,
      isFallback: !canAskAi,
    });
  }

  useEffect(() => {
    if (!asksAi) return;
    const controller = new AbortController();
    let timedOut = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const send = async () => {
      sendNowRef.current = null;
      timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, TIMEOUT_MS);
      let reply: QuickAddResponse | null = null;
      let noModel = false;
      try {
        reply = await bankApiClient.quickAdd({ text }, controller.signal);
      } catch (error) {
        noModel = error instanceof FinanceApiError && error.status === 503;
      }
      clearTimeout(timeout);
      if (controller.signal.aborted && !timedOut) return;
      if (noModel) setHasNoModel(true);
      const read = reply?.text === text ? reply : null;
      setAnswer((previous) => ({
        id: previous.id + 1,
        text,
        reply: read,
        isFallback: read === null,
      }));
    };
    const debounce = setTimeout(() => void send(), DEBOUNCE_MS);
    sendNowRef.current = () => {
      clearTimeout(debounce);
      void send();
    };
    return () => {
      clearTimeout(debounce);
      clearTimeout(timeout);
      controller.abort();
      sendNowRef.current = null;
    };
  }, [asksAi, text]);

  return {
    interpretation: interpretQuickAdd(data, answer),
    isCurrent: isEmpty || answer.text === text,
    interpretNow: () => {
      sendNowRef.current?.();
    },
  };
}
