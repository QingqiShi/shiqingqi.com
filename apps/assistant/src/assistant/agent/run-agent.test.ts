import { MockLanguageModelV3 } from "ai/test";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { agentRuns, userSettings } from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import {
  createFakeMailServer,
  rawMail,
  type FakeMailServer,
} from "#src/assistant/mail/testing/create-fake-mail-server.ts";
import {
  insertAccount,
  insertUser,
  mailDeps,
} from "#src/assistant/mail/testing/insert-account.ts";
import { organiseUserMail } from "#src/assistant/organise/organise-user-mail.ts";

type DoGenerate = Extract<
  NonNullable<
    NonNullable<
      ConstructorParameters<typeof MockLanguageModelV3>[0]
    >["doGenerate"]
  >,
  (...args: never[]) => unknown
>;
type Prompt = Parameters<DoGenerate>[0]["prompt"];
type Content = Awaited<ReturnType<DoGenerate>>["content"][number];

const USAGE = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};

function reply(content: Content[], toolCalls: boolean) {
  return Promise.resolve({
    content,
    finishReason: toolCalls
      ? { unified: "tool-calls" as const, raw: "tool_use" }
      : { unified: "stop" as const, raw: "end_turn" },
    usage: USAGE,
    warnings: [],
  });
}

function call(name: string, input: unknown, id: string) {
  return {
    type: "tool-call" as const,
    toolCallId: id,
    toolName: name,
    input: JSON.stringify(input),
  };
}

const listedSchema = z.object({
  mails: z.array(z.object({ id: z.string() })),
});

function listedIn(prompt: Prompt) {
  for (const message of prompt) {
    if (message.role !== "tool") continue;
    for (const part of message.content) {
      if (
        part.type === "tool-result" &&
        part.toolCallId === "list" &&
        part.output.type === "json"
      ) {
        return listedSchema.parse(part.output.value).mails;
      }
    }
  }
  return null;
}

/** Lists the inbox, reads two mails in parallel, and ends. */
function scriptedAgent() {
  let read = false;
  const model = new MockLanguageModelV3({
    doGenerate: ({ prompt }) => {
      const listed = listedIn(prompt);
      if (!listed) {
        return reply(
          [call("list_mail", { account: "a1", folder: "INBOX" }, "list")],
          true,
        );
      }
      if (!read) {
        read = true;
        return reply(
          listed.map(({ id }) =>
            call("read_mail", { ids: [id] }, `read-${id}`),
          ),
          true,
        );
      }
      return reply([{ type: "text", text: "Done." }], false);
    },
  });
  return { id: "agent-model", model };
}

function readerThat(whileReading: () => Promise<void>) {
  const model = new MockLanguageModelV3({
    doGenerate: async () => {
      await whileReading();
      return reply([{ type: "text", text: '{"mails":[]}' }], false);
    },
  });
  return { id: "reader-model", model };
}

let db: TestDb;
let userId: string;
let server: FakeMailServer;

beforeEach(async () => {
  db = await createTestDb();
  userId = await insertUser(db);
  await insertAccount(db, userId);
  await db.insert(userSettings).values({ userId, organiseEnabled: true });
  server = createFakeMailServer({
    user: "me@icloud.com",
    password: "app-password",
  });
  server.deliver(
    "INBOX",
    rawMail({
      messageId: "<one@example.com>",
      subject: "Flight to Tokyo",
      body: "Secret mail text",
    }),
  );
  server.deliver(
    "INBOX",
    rawMail({ messageId: "<two@example.com>", subject: "Card statement" }),
  );
});

afterEach(async () => {
  vi.restoreAllMocks();
  await db.close();
});

function organise(whileReading: () => Promise<void>) {
  return organiseUserMail(
    { db, userId, endsAt: Number.POSITIVE_INFINITY },
    {
      ...mailDeps({ connector: server.connector }),
      calendarConnector: () => Promise.reject(new Error("No calendar")),
      agent: scriptedAgent(),
      reader: readerThat(whileReading),
    },
  );
}

async function storedRun() {
  const [run] = await db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.userId, userId));
  return run;
}

describe("the progress of a run", () => {
  it("shows parallel calls with their subjects while they run, and is null after the run", async () => {
    let during: Awaited<ReturnType<typeof storedRun>>["progress"] = null;
    await organise(async () => {
      await vi.waitFor(
        async () => {
          during = (await storedRun()).progress;
          expect(during?.inFlight).toHaveLength(2);
        },
        { timeout: 5000, interval: 50 },
      );
    });

    expect(during).toEqual({
      inFlight: [
        {
          kind: "read_mail",
          count: 1,
          subject: "Flight to Tokyo",
          sender: "Sender <sender@example.com>",
        },
        {
          kind: "read_mail",
          count: 1,
          subject: "Card statement",
          sender: "Sender <sender@example.com>",
        },
      ],
      recent: [{ kind: "list_mail", folder: "INBOX" }],
    });
    expect(JSON.stringify(during)).not.toContain("Secret mail text");
    const run = await storedRun();
    expect(run.status).toBe("done");
    expect(run.progress).toBeNull();
  });

  it("does not stop the run when a write fails, and logs no mail header", async () => {
    await db.execute(sql`
      create function refuse_progress() returns trigger as $$
      begin
        if new.progress is not null then
          raise exception 'no progress';
        end if;
        return new;
      end;
      $$ language plpgsql
    `);
    await db.execute(sql`
      create trigger refuse_progress before update on agent_runs
      for each row execute function refuse_progress()
    `);
    const logged = vi.spyOn(console, "error");
    const failures = () =>
      logged.mock.calls.filter(
        ([message]) => message === "Agent progress write failed",
      );

    const result = await organise(() =>
      vi.waitFor(() => {
        expect(failures().length).toBeGreaterThan(0);
      }),
    );

    expect(result.run).toEqual({ status: "done", steps: 3 });
    const run = await storedRun();
    expect(run.status).toBe("done");
    expect(run.transcript).toHaveLength(3);
    expect(run.progress).toBeNull();
    expect(JSON.stringify(failures())).toContain("no progress");
    expect(JSON.stringify(failures())).not.toContain("Flight to Tokyo");
  });
});
