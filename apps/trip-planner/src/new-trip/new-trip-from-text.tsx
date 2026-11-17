"use client";

import { ApiError } from "@tuja/auth-ui/api-error";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { FormFooter } from "@tuja/ui/components/form-footer";
import { Textarea } from "@tuja/ui/components/textarea";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useRouter } from "next/navigation";
import { useRef, useState, type RefObject, type SubmitEvent } from "react";
import { aiApi, type TripDraft } from "#src/ai/ai-api.ts";
import { deviceTimeZone } from "#src/time-zones/time-zone-label.ts";
import { tripApi } from "#src/trips/trip-api.ts";
import { fillNewTrip, type Filled } from "./fill-new-trip.ts";

/** The longest plan that the model reads, in characters, as the server counts them. */
const MAX_PLAN_LENGTH = 50_000;

/** A trip made from a plan, and what to tell the person in it. */
export interface MadeTrip extends Filled {
  tripId: string;
  /** The model's word to the person, such as what it left out. */
  message: string;
}

type Failure = "unreadable" | "unavailable" | "signedOut" | "failed";

function failureOf(error: unknown): Failure {
  if (!(error instanceof ApiError)) return "failed";
  if (error.status === 502 || error.status === 504) return "unreadable";
  if (error.status === 503) return "unavailable";
  if (error.status === 401) return "signedOut";
  return "failed";
}

/**
 * A new trip from a pasted plan. The model reads the plan, the trip is made
 * from its answer, and the editor opens on it. Until the trip is made,
 * Cancel stops the request and a failure keeps the text. After that, the
 * trip opens also when only part of the plan saved.
 */
export function NewTripFromText({
  textRef,
  text,
  onTextChange,
  onWorkingChange,
  onMade,
  onStartEmpty,
}: {
  textRef: RefObject<HTMLTextAreaElement | null>;
  text: string;
  onTextChange: (text: string) => void;
  /** True from the request until the trip opens or the request ends. */
  onWorkingChange: (isWorking: boolean) => void;
  onMade: (made: MadeTrip) => void;
  /** Goes to the fields of an empty trip. */
  onStartEmpty: () => void;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "reading" | "saving">("idle");
  const [failure, setFailure] = useState<Failure | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const length = text.trim().length;
  const textError =
    length > MAX_PLAN_LENGTH
      ? t({
          en: "The plan is too long: {count} characters. It can have up to 50,000.",
          zh: "计划太长了，共 {count} 个字符，最多可以有 50,000 个。",
        }).replace("{count}", new Intl.NumberFormat(locale).format(length))
      : showErrors && length === 0
        ? t({ en: "Paste a plan first.", zh: "请先粘贴计划。" })
        : undefined;

  function setWorking(next: typeof phase) {
    setPhase(next);
    onWorkingChange(next !== "idle");
  }

  async function make() {
    setShowErrors(true);
    if (length === 0 || length > MAX_PLAN_LENGTH) return;
    if (controllerRef.current !== null) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setFailure(null);
    setWorking("reading");
    let draft: TripDraft;
    let tripId: string;
    try {
      draft = await aiApi.draft(
        { text, timeZone: deviceTimeZone(), locale },
        controller.signal,
      );
      controller.signal.throwIfAborted();
      setPhase("saving");
      tripId = await tripApi.create(draft.fields);
    } catch (error) {
      controllerRef.current = null;
      setWorking("idle");
      if (!controller.signal.aborted) setFailure(failureOf(error));
      return;
    }
    const filled = await fillNewTrip(draft, tripId, tripApi);
    onMade({ tripId, message: draft.message, ...filled });
    router.refresh();
    router.push(getLocalePath(`/${tripId}/edit`, locale));
  }

  return (
    <form
      noValidate
      css={stack.group}
      onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        void make();
      }}
    >
      <Textarea
        ref={textRef}
        label={t({ en: "Your plan", zh: "你的计划" })}
        description={t({
          en: "Paste notes, an email or a list from a chat. The days, places and times in it become the trip.",
          zh: "粘贴笔记、邮件或聊天里的清单，其中的日期、地点和时间会变成行程。",
        })}
        rows={5}
        value={text}
        readOnly={phase !== "idle"}
        error={textError}
        onChange={(event) => {
          onTextChange(event.target.value);
        }}
      />
      {phase === "reading" ? (
        <Callout
          role="status"
          title={t({ en: "Reading your plan", zh: "正在读取你的计划" })}
          action={
            <Button
              size="sm"
              onClick={() => {
                controllerRef.current?.abort();
              }}
            >
              {t({ en: "Cancel", zh: "取消" })}
            </Button>
          }
        >
          {t({
            en: "This can take a minute or more. The trip opens when it is ready.",
            zh: "这可能需要一分钟或更久。完成后会打开新行程。",
          })}
        </Callout>
      ) : phase === "saving" ? (
        <Callout
          role="status"
          title={t({ en: "Making the trip", zh: "正在创建行程" })}
        >
          {t({
            en: "The plan is read. Its days go into the new trip now.",
            zh: "计划已读取，正在把每天的安排加入新行程。",
          })}
        </Callout>
      ) : failure === "unreadable" ? (
        <Callout intent="destructive" role="alert">
          {t({
            en: "No trip could be made from this text. Add the dates and places, or change the text, and try again.",
            zh: "无法根据这段文字生成行程。请补充日期和地点，或修改文字后重试。",
          })}
        </Callout>
      ) : failure === "unavailable" ? (
        <Callout
          intent="destructive"
          role="alert"
          action={
            <Button size="sm" onClick={onStartEmpty}>
              {t({ en: "Start empty", zh: "空白行程" })}
            </Button>
          }
        >
          {t({
            en: "Making a trip from a plan is not available now. Start an empty trip and add the days yourself.",
            zh: "暂时不能根据计划生成行程。你可以新建空白行程，自己添加每天的安排。",
          })}
        </Callout>
      ) : failure === "signedOut" ? (
        <Callout intent="destructive" role="alert">
          {t({
            en: "You are signed out. Sign in again, then try again.",
            zh: "你已退出登录。请重新登录后再试。",
          })}
        </Callout>
      ) : failure === "failed" ? (
        <Callout intent="destructive" role="alert">
          {t({
            en: "The trip was not made. Check the connection and try again.",
            zh: "行程没有创建成功。请检查网络后重试。",
          })}
        </Callout>
      ) : null}
      <FormFooter>
        <Button type="submit" look="primary" loading={phase !== "idle"}>
          {t({ en: "Make trip", zh: "生成行程" })}
        </Button>
      </FormFooter>
    </form>
  );
}
