import { generateText, Output } from "ai";
import type { AssistantModel } from "#src/assistant/ai/get-classifier-model.ts";
import type { UserLocale } from "#src/assistant/db/schema.ts";
import type { DayMail } from "./read-day-mail.ts";
import {
  describeMail,
  reportPrompt,
  type OpenTodo,
  type ReportPromptOutput,
} from "./report-prompt.ts";
import type { MailSource, ReportItem, ReportStatus } from "./types.ts";

/** The most mails that go to the model in one report. */
export const MAX_MAILS = 300;
/** An estimate of the most input tokens the mails may take: well inside the model's context. */
export const MAIL_TOKEN_BUDGET = 200_000;
const MAX_OUTPUT_TOKENS = 16_000;
export const REPORT_MODEL_TIMEOUT_MS = 120_000;
const MAX_LINE_LENGTH = 400;
const MAX_TITLE_LENGTH = 120;
const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A rough count that is high rather than low: four ASCII characters a token, one other character a token. */
function estimateTokens(text: string) {
  let ascii = 0;
  let other = 0;
  for (const char of text) {
    if (char.charCodeAt(0) < 128) ascii += 1;
    else other += 1;
  }
  return Math.ceil(ascii / 4) + other;
}

function isBulk(mail: DayMail) {
  return (
    mail.listId !== null ||
    mail.listUnsubscribe !== null ||
    mail.precedence !== null ||
    (mail.autoSubmitted !== null && mail.autoSubmitted !== "no")
  );
}

/**
 * The mails the model reads, in the order they came: when there are more
 * than the limits allow, mail from people goes first and newsletters and
 * notifications fill what is left.
 */
export function pickMailForModel(
  mails: readonly DayMail[],
  timeZone: string,
): { picked: DayMail[]; leftOut: number } {
  const ranked = [...mails].sort(
    (a, b) =>
      Number(isBulk(a)) - Number(isBulk(b)) ||
      a.receivedAt.getTime() - b.receivedAt.getTime(),
  );
  const picked: DayMail[] = [];
  let tokens = 0;
  for (const mail of ranked) {
    if (picked.length >= MAX_MAILS) break;
    const cost = estimateTokens(describeMail("m000", mail, timeZone));
    if (tokens + cost > MAIL_TOKEN_BUDGET) continue;
    tokens += cost;
    picked.push(mail);
  }
  picked.sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
  return { picked, leftOut: mails.length - picked.length };
}

export interface NewTodo {
  title: string;
  detail: string | null;
  dueDate: string | null;
  source: MailSource | null;
}

export interface WrittenReport {
  status: ReportStatus;
  modelId: string | null;
  promptVersion: number | null;
  headline: string | null;
  needsAction: ReportItem[];
  worthKnowing: ReportItem[];
  rest: string | null;
  todos: NewTodo[];
}

function clean(value: string | null, limit: number): string | null {
  const line = (value ?? "").replaceAll(/\s+/g, " ").trim();
  return line === "" ? null : line.slice(0, limit);
}

function isLocalDate(value: string | null): value is string {
  if (value === null || !LOCAL_DATE.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(value);
}

/** The model's output with each mail key turned into the mail it names; an unknown key names no mail. */
export function readModelOutput(
  output: ReportPromptOutput,
  keyed: ReadonlyMap<string, DayMail>,
): Pick<
  WrittenReport,
  "headline" | "needsAction" | "worthKnowing" | "rest" | "todos"
> {
  const sourceOf = (key: string | null): MailSource | null => {
    const mail = key === null ? undefined : keyed.get(key.trim());
    return mail
      ? { accountId: mail.accountId, messageId: mail.messageId }
      : null;
  };
  const items = (list: ReportPromptOutput["needsAction"]) =>
    list.flatMap((entry) => {
      const text = clean(entry.text, MAX_LINE_LENGTH);
      return text ? [{ text, source: sourceOf(entry.mail) }] : [];
    });
  return {
    headline: clean(output.headline, MAX_LINE_LENGTH),
    needsAction: items(output.needsAction),
    worthKnowing: items(output.worthKnowing),
    rest: clean(output.rest, MAX_LINE_LENGTH),
    todos: output.todos.flatMap((todo) => {
      const title = clean(todo.title, MAX_TITLE_LENGTH);
      if (!title) return [];
      return [
        {
          title,
          detail: clean(todo.detail, MAX_LINE_LENGTH),
          dueDate: isLocalDate(todo.dueDate) ? todo.dueDate : null,
          source: sourceOf(todo.mail),
        },
      ];
    }),
  };
}

const EMPTY = {
  headline: null,
  needsAction: [],
  worthKnowing: [],
  rest: null,
  todos: [],
} satisfies Partial<WrittenReport>;

/**
 * Has the model write the report from the day's mail and the open to-dos.
 * With no mail it calls no model. With no model, or when the call fails,
 * the result says so and has no lines.
 */
export async function writeReport({
  mails,
  leftOut,
  openTodos,
  model,
  locale,
  mailDate,
  today,
  timeZone,
}: {
  mails: readonly DayMail[];
  leftOut: number;
  openTodos: readonly OpenTodo[];
  model: AssistantModel | null;
  locale: UserLocale;
  mailDate: string;
  today: string;
  timeZone: string;
}): Promise<WrittenReport> {
  const none = { modelId: null, promptVersion: null, ...EMPTY };
  if (mails.length === 0) return { status: "no-mail", ...none };
  if (!model) return { status: "no-model", ...none };
  const keyed = new Map(
    mails.map((mail, index) => [`m${String(index + 1)}`, mail]),
  );
  try {
    const result = await generateText({
      model: model.model,
      output: Output.object({ schema: reportPrompt.outputSchema }),
      reasoning: "medium",
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      abortSignal: AbortSignal.timeout(REPORT_MODEL_TIMEOUT_MS),
      instructions: reportPrompt.instructions(locale),
      messages: [
        {
          role: "user",
          content: reportPrompt.describeInput({
            mails: [...keyed].map(([key, mail]) => ({ key, mail })),
            openTodos,
            mailDate,
            today,
            timeZone,
            leftOut,
          }),
        },
      ],
    });
    return {
      status: "written",
      modelId: model.id,
      promptVersion: reportPrompt.version,
      ...readModelOutput(result.output, keyed),
    };
  } catch (error) {
    console.error(
      "Morning report failed",
      error instanceof Error ? error.message : error,
    );
    return { status: "failed", ...none, modelId: model.id };
  }
}
