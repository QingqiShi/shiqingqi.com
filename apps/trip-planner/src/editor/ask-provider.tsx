"use client";

import { ApiError } from "@tuja/auth-ui/api-error";
import { t } from "@tuja/i18n";
import { useToast } from "@tuja/ui/components/toast-provider";
import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { aiApi, type Proposal } from "#src/ai/ai-api.ts";
import {
  checkBatches,
  landingOf,
  type BatchCheck,
  type Decision,
} from "./check-batches.ts";
import { useEditor } from "./editor-provider.tsx";

/** The longest prompt that the server takes, in characters. */
const PROMPT_LIMIT = 4000;

/** Why a request gave no answer. */
export type AskFailure =
  /** The model gave nothing that applies to the trip. */
  | "nothing"
  /** The model took too long. */
  | "slow"
  /** No model is set up here. */
  | "unavailable"
  /** The person can no longer change the trip. */
  | "gone"
  /** The prompt is too long. */
  | "long"
  /** The request did not get an answer. */
  | "failed";

/** One answer of the model. `id` changes with each answer. */
interface Answer extends Proposal {
  id: number;
}

interface Ask {
  /** What the person typed. It stays when a request fails or is cancelled. */
  prompt: string;
  setPrompt: (prompt: string) => void;
  isAsking: boolean;
  failure: AskFailure | null;
  /** The newest answer, until the next one comes. */
  answer: Answer | null;
  decisions: ReadonlyMap<number, Decision>;
  /** For each batch of the answer, whether the trip can take it now. Null for a batch with a decision. */
  checks: readonly (BatchCheck | null)[];
  /** The batches that the person can still accept, in order. */
  open: readonly number[];
  /** The batches with no decision that the trip cannot take now. */
  stale: readonly number[];
  /** The accepted batch that the editor's undo takes back now, when it is one. */
  undoable: number | null;
  /** Sends the prompt. `dayId` is the day on screen. One request runs at a time. */
  send: (dayId?: string) => void;
  cancel: () => void;
  /**
   * Makes each of the batches a change of its own, in order, and offers to
   * undo them all in one toast. It gives the batches that the trip took,
   * and the row that shows the last one.
   */
  accept: (indexes: readonly number[]) => { made: number[]; rowId?: string };
  skip: (index: number) => void;
  /** Takes back a skip. */
  restore: (index: number) => void;
}

const AskContext = createContext<Ask | null>(null);

export function useAsk(): Ask {
  const ask = use(AskContext);
  if (!ask) throw new Error("useAsk must be used within AskProvider");
  return ask;
}

function failureOf(error: unknown): AskFailure {
  if (!(error instanceof ApiError)) return "failed";
  switch (error.status) {
    case 502:
      return "nothing";
    case 504:
      return "slow";
    case 503:
      return "unavailable";
    case 404:
      return "gone";
    default:
      return "failed";
  }
}

/**
 * The request to the model for changes to the trip, and the decisions of
 * the person about its answer. The answer saves nothing: each batch that
 * the person accepts is a change of the editor, as one made by hand.
 */
export function AskProvider({ children }: { children: ReactNode }) {
  const editor = useEditor();
  const { tripId, queue } = editor;
  const showToast = useToast();
  const [prompt, setPrompt] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [failure, setFailure] = useState<AskFailure | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  // `batchId` is the change of the queue that an accepted batch is.
  const [decided, setDecided] = useState<
    ReadonlyMap<number, { decision: Decision; batchId?: number }>
  >(() => new Map());
  // The request that runs. A press of Enter can come two times before the
  // field shows as off, and an answer can come after a cancel.
  const requestRef = useRef<AbortController | null>(null);

  const acceptedOne = t({ en: "Change accepted", zh: "已采纳修改" });
  const acceptedMany = t({
    en: "{count} changes accepted",
    zh: "已采纳 {count} 项修改",
  });
  const undoLabel = t({ en: "Undo", zh: "撤销" });
  const takenBackMany = t({
    en: "{count} changes taken back",
    zh: "已撤销 {count} 项修改",
  });

  useEffect(
    () => () => {
      requestRef.current?.abort();
    },
    [],
  );

  // A batch that the person took back, or that the queue dropped, is not in
  // the trip, so the person can decide about it again.
  useEffect(
    () =>
      queue.onTakenBack((ids) => {
        setDecided((current) => {
          const kept = [...current].filter(
            ([, { batchId }]) => batchId === undefined || !ids.has(batchId),
          );
          return kept.length === current.size ? current : new Map(kept);
        });
      }),
    [queue],
  );

  const batches = answer?.batches ?? [];
  const decisions = new Map(
    [...decided].map(([index, { decision }]) => [index, decision]),
  );
  const checks = checkBatches(editor.trip, batches, decisions);
  const open = checks.flatMap((check, index) =>
    check && check.state !== "stale" ? [index] : [],
  );
  const stale = checks.flatMap((check, index) =>
    check?.state === "stale" ? [index] : [],
  );
  const undoable =
    [...decided].find(
      ([, { batchId }]) =>
        batchId !== undefined && batchId === editor.state.undoes,
    )?.[0] ?? null;

  const ask: Ask = {
    prompt,
    setPrompt(next) {
      setPrompt(next);
      setFailure(null);
    },
    isAsking,
    failure,
    answer,
    decisions,
    checks,
    open,
    stale,
    undoable,
    send(dayId) {
      const text = prompt.trim();
      if (!text || requestRef.current || !editor.canEdit) return;
      if (text.length > PROMPT_LIMIT) {
        setFailure("long");
        return;
      }
      const request = new AbortController();
      requestRef.current = request;
      setIsAsking(true);
      setFailure(null);
      const isCurrent = () => {
        if (requestRef.current !== request) return false;
        requestRef.current = null;
        setIsAsking(false);
        return true;
      };
      aiApi.propose({ tripId, prompt: text, dayId }, request.signal).then(
        (proposal) => {
          if (!isCurrent()) return;
          setAnswer((last) => ({ ...proposal, id: (last?.id ?? 0) + 1 }));
          setDecided(new Map());
          if (proposal.batches.length === 0) return;
          // The words of a request that gave changes are used up. A reply
          // with no change often asks for other words.
          setPrompt("");
          // The model read the newest trip. A change of another person that
          // this editor does not have yet would make a batch not fit.
          queue.sync();
        },
        (error: unknown) => {
          if (!isCurrent()) return;
          const why = failureOf(error);
          setFailure(why);
          // The editor finds out in its own way that the trip is gone.
          if (why === "gone") queue.sync();
        },
      );
    },
    cancel() {
      requestRef.current?.abort();
      requestRef.current = null;
      setIsAsking(false);
    },
    accept(indexes) {
      const made: [number, number][] = [];
      let rowId: string | undefined;
      for (const index of indexes) {
        const batch = batches.at(index);
        if (!batch) continue;
        // Each batch goes on the trip with the batches before it, and only
        // when the trip can take it as the list shows.
        const check = checkBatches(
          queue.getState().trip,
          batches,
          new Map([
            ...decisions,
            ...made.map(([each]) => [each, "accepted"] as const),
          ]),
        ).at(index);
        if (check?.state !== "ready") continue;
        const landing = landingOf(check.after, batch);
        const result = editor.change(batch.ops, {
          message: acceptedOne,
          dayId: landing.dayId,
          thingId: landing.thingId,
          quiet: true,
        });
        if (!result.ok || result.batchId === undefined) continue;
        made.push([index, result.batchId]);
        rowId = landing.rowId ?? rowId;
      }
      if (made.length === 0) return { made: [] };
      setDecided((current) => {
        const next = new Map(current);
        for (const [index, batchId] of made) {
          next.set(index, { decision: "accepted", batchId });
        }
        return next;
      });
      showToast({
        message:
          made.length === 1
            ? acceptedOne
            : acceptedMany.replace("{count}", String(made.length)),
        action: {
          label: undoLabel,
          onAction() {
            // The newest goes first. The undo stops at a batch that is not
            // the newest change of the editor, and at one that cannot go:
            // the editor then says why.
            const all = made
              .toReversed()
              .every(
                ([, batchId]) =>
                  queue.getState().undoes === batchId &&
                  editor.undo() === "taken",
              );
            if (all && made.length > 1) {
              showToast({
                message: takenBackMany.replace("{count}", String(made.length)),
              });
            }
          },
        },
      });
      if (rowId) editor.reveal(rowId);
      return { made: made.map(([index]) => index), rowId };
    },
    skip(index) {
      setDecided((current) =>
        new Map(current).set(index, { decision: "skipped" }),
      );
    },
    restore(index) {
      setDecided((current) => {
        const next = new Map(current);
        next.delete(index);
        return next;
      });
    },
  };

  return <AskContext value={ask}>{children}</AskContext>;
}
