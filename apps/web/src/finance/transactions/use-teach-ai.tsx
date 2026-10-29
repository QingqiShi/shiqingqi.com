import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Spinner } from "@tuja/ui/components/spinner";
import { Text } from "@tuja/ui/components/text";
import { Textarea } from "@tuja/ui/components/textarea";
import type { ToastAction } from "@tuja/ui/components/toast";
import { useToast } from "@tuja/ui/components/toast-provider";
import { cluster, row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color } from "@tuja/ui/tokens.stylex";
import { useId, useRef, useState, type SubmitEvent } from "react";
import { t } from "#src/i18n.ts";
import type { InstructionChange, TeachRequest } from "../ai/types.ts";
import { bankApiClient } from "../bank/bank-api-client.ts";
import { FinanceApiError } from "../http/finance-api-error.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { useReplicaStore } from "../replica/use-replica-store.ts";
import { householdApiClient } from "../settings/household-api-client.ts";
import { MAX_INSTRUCTION_LINE_LENGTH } from "../settings/max-ai-instructions-length.ts";
import { PaneSheet } from "../shell/pane-sheet.tsx";
import { withPending } from "../shell/with-pending.ts";
import { useSystemCategoryNames } from "../store/use-category-display-name.ts";
import { aiCorrection, labelledTransactionIn } from "./ai-correction.ts";
import { useTransactionLookups } from "./use-transaction-lookups.ts";

type Draft =
  | { status: "drafting" }
  | { status: "failed" }
  | { status: "ready"; change: InstructionChange };

/**
 * "Teach the AI": after a Member corrects the labels the AI gave a
 * Transaction, the AI drafts a line for the AI instructions, and the Member
 * edits it and saves it, or dismisses it.
 *
 * `watch(id)` before a save reads the labels; the function it returns, after
 * the save, gives the toast action that opens `sheet`, or nothing when the
 * save did not correct the AI, or in the demo, which cannot reach the AI.
 */
export function useTeachAi() {
  const store = useReplicaStore();
  const { readOnly } = useFinanceRuntime();
  const lookups = useTransactionLookups();
  const categoryNames = useSystemCategoryNames();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<{
    request: TeachRequest;
    attempt: number;
    draft: Draft;
  } | null>(null);
  const attemptRef = useRef(0);
  const label = t({ en: "Teach the AI", zh: "教 AI" });

  const start = async (request: TeachRequest) => {
    attemptRef.current++;
    const attempt = attemptRef.current;
    const settle = (draft: Draft) => {
      if (attempt === attemptRef.current) {
        setSession({ request, attempt, draft });
      }
    };
    setSession({ request, attempt, draft: { status: "drafting" } });
    setOpen(true);
    try {
      settle({ status: "ready", change: await bankApiClient.teach(request) });
    } catch {
      settle({ status: "failed" });
    }
  };

  const watch = (transactionId: string) => {
    const before = labelledTransactionIn(store.getSnapshot(), transactionId);
    if (readOnly || before?.labelledBy !== "ai") return () => undefined;
    return (): ToastAction | undefined => {
      const request = aiCorrection(
        before,
        labelledTransactionIn(store.getSnapshot(), transactionId),
        lookups,
        categoryNames,
      );
      if (!request) return undefined;
      return {
        label,
        onAction: () => {
          void start(request);
        },
      };
    };
  };

  const close = () => {
    attemptRef.current++;
    setOpen(false);
  };
  const sheet = (
    <PaneSheet isOpen={open} onClose={close} label={label}>
      {session ? (
        <TeachAiForm
          key={session.attempt}
          title={label}
          draft={session.draft}
          onRetry={() => {
            void start(session.request);
          }}
          onClose={close}
        />
      ) : null}
    </PaneSheet>
  );
  return { watch, sheet };
}

interface TeachAiFormProps {
  title: string;
  draft: Draft;
  onRetry: () => void;
  onClose: () => void;
}

function TeachAiForm({ title, draft, onRetry, onClose }: TeachAiFormProps) {
  const headingId = useId();
  const { runtime } = useFinanceRuntime();
  const showToast = useToast();
  const [edited, setEdited] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const messages = {
    saved: t({ en: "AI instructions saved", zh: "AI 说明已保存" }),
    failed: t({
      en: "The instructions did not save. Try again when you are online.",
      zh: "说明未能保存，请联网后重试。",
    }),
    tooLong: t({
      en: "The instructions are at their length limit. Shorten them in Settings first.",
      zh: "说明已达字数上限，请先在设置中精简。",
    }),
  };
  const change = draft.status === "ready" ? draft.change : null;
  const line = edited ?? change?.line ?? "";

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!change || line.trim() === "") return;
    await withPending(setSaving, async () => {
      setSaveError(null);
      try {
        await householdApiClient.changeAiInstructions({
          replaces: change.replaces,
          line: line.trim(),
        });
        await runtime.loop.sync();
        showToast({ message: messages.saved, durationMs: 4000 });
        onClose();
      } catch (error) {
        setSaveError(
          error instanceof FinanceApiError && error.code === "too-long"
            ? messages.tooLong
            : messages.failed,
        );
      }
    });
  }

  return (
    <form
      aria-labelledby={headingId}
      noValidate
      css={[stack.group, styles.form]}
      onSubmit={(event) => void save(event)}
    >
      <div css={stack.text}>
        <Heading id={headingId} level={2} look="h3">
          {title}
        </Heading>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "A line for the AI instructions, so the AI labels rows like this one the way you did. Edit it before you save.",
            zh: "为 AI 说明拟写的一行，让 AI 以后像你这样标注类似的交易。保存前可以修改。",
          })}
        </Text>
      </div>
      {draft.status === "drafting" ? (
        <div css={row.tight} role="status">
          <Spinner size="sm" aria-hidden />
          <Text as="span" tone="muted">
            {t({ en: "Drafting a line…", zh: "正在拟写…" })}
          </Text>
        </div>
      ) : draft.status === "failed" ? (
        <p role="alert" css={typeRole.body}>
          {t({
            en: "The AI could not draft a line.",
            zh: "AI 未能拟写出一行。",
          })}
        </p>
      ) : (
        <div css={stack.item}>
          {draft.change.replaces === null ? null : (
            <div css={stack.tight}>
              <Text as="span" look="caption" tone="muted">
                {t({ en: "Replaces", zh: "替换" })}
              </Text>
              <del css={[typeRole.bodySmall, styles.replaced]}>
                {draft.change.replaces}
              </del>
            </div>
          )}
          <Textarea
            label={
              draft.change.replaces === null
                ? t({ en: "New line", zh: "新增一行" })
                : t({ en: "Changed line", zh: "修改后" })
            }
            value={line}
            maxLength={MAX_INSTRUCTION_LINE_LENGTH}
            rows={2}
            autoGrow
            error={saveError ?? undefined}
            onChange={(event) => {
              setEdited(event.target.value);
              setSaveError(null);
            }}
          />
        </div>
      )}
      <div css={cluster.tight}>
        {draft.status === "failed" ? (
          <Button look="primary" onClick={onRetry}>
            {t({ en: "Try again", zh: "重试" })}
          </Button>
        ) : (
          <Button
            type="submit"
            look="primary"
            disabled={change === null || line.trim() === ""}
            loading={saving}
          >
            {t({ en: "Save to instructions", zh: "保存到说明" })}
          </Button>
        )}
        <Button look="ghost" onClick={onClose}>
          {t({ en: "Dismiss", zh: "不用了" })}
        </Button>
      </div>
    </form>
  );
}

const styles = stylex.create({
  form: {
    maxInlineSize: "40rem",
  },
  replaced: {
    color: color.fgMuted,
  },
});
