import { createServer, type Server } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createImapflowConnector } from "#src/assistant/mail/imap/imapflow-connector.ts";
import { MoveUnsupportedError } from "#src/assistant/mail/imap/move-unsupported-error.ts";

interface ScriptedMail {
  uid: number;
  flags: string[];
  messageId?: string;
}

function mail(
  uid: number,
  flags: string[] = [],
  messageId = `<${String(uid)}@x>`,
) {
  return { uid, flags, messageId };
}

function uidsOf(set: string) {
  return set.split(",").map(Number);
}

/**
 * A scripted IMAP server without UNSELECT. Like a real server, CLOSE and
 * EXPUNGE remove the mail flagged \Deleted from a folder selected for writes,
 * and UID EXPUNGE only the named mail of it. A command that starts with an
 * entry of `refuseOnce` gets a NO, the first time.
 */
function startImapServer(
  folders: Map<string, ScriptedMail[]>,
  capabilities: string,
  refuseOnce: string[],
) {
  const commands: string[] = [];
  const server = createServer((socket) => {
    let selected: { path: string; write: boolean } | null = null;
    let buffered = "";
    const send = (line: string) => socket.write(`${line}\r\n`);
    const openMail = () => folders.get(selected?.path ?? "") ?? [];
    const expungeSelected = (named?: number[]) => {
      if (!selected?.write) return;
      const kept = openMail().filter(
        ({ uid, flags }) =>
          !flags.includes("\\Deleted") || (named && !named.includes(uid)),
      );
      folders.set(selected.path, kept);
    };
    const handleUid = (tag: string, name: string, args: string[]) => {
      const uids = uidsOf(args[0] ?? "");
      const named = openMail().filter(({ uid }) => uids.includes(uid));
      switch (name) {
        case "FETCH":
          for (const { uid, flags, messageId } of named) {
            const seq = openMail().findIndex((m) => m.uid === uid) + 1;
            send(
              `* ${String(seq)} FETCH (UID ${String(uid)} FLAGS (${flags.join(" ")}) INTERNALDATE "01-Nov-2026 09:00:00 +0000" RFC822.SIZE 100 ENVELOPE ("Sun, 01 Nov 2026 09:00:00 +0000" "Hi" NIL NIL NIL NIL NIL NIL NIL "${messageId ?? ""}"))`,
            );
          }
          break;
        case "COPY": {
          const target = (args[1] ?? "").replace(/^"|"$/g, "");
          const into = folders.get(target) ?? [];
          const newUids = named.map((message) => {
            const uid = 100 + into.length;
            into.push({ ...message, uid, flags: [...message.flags] });
            return uid;
          });
          send(
            `${tag} OK [COPYUID 1 ${named.map((m) => m.uid).join(",")} ${newUids.join(",")}] Done`,
          );
          return;
        }
        case "STORE": {
          const remove = args[1]?.startsWith("-");
          for (const message of named) {
            const others = message.flags.filter((f) => f !== "\\Deleted");
            message.flags = remove ? others : [...others, "\\Deleted"];
          }
          break;
        }
        case "EXPUNGE":
          expungeSelected(uids);
          break;
        default:
          send(`${tag} BAD Unknown command`);
          return;
      }
      send(`${tag} OK Done`);
    };
    const handle = (line: string) => {
      const [tag = "", name = "", ...args] = line.split(" ");
      const command = name.toUpperCase();
      const path = (args[0] ?? "").replace(/^"|"$/g, "");
      const sent = line.slice(tag.length + 1);
      commands.push(sent);
      const refused = refuseOnce.findIndex((start) => sent.startsWith(start));
      if (refused >= 0) {
        refuseOnce.splice(refused, 1);
        send(`${tag} NO Refused`);
        return;
      }
      if (command === "UID") {
        const [uidCommand = "", ...uidArgs] = args;
        handleUid(tag, uidCommand.toUpperCase(), uidArgs);
        return;
      }
      switch (command) {
        case "CAPABILITY":
          send(`* CAPABILITY ${capabilities}`);
          break;
        case "LOGIN":
          send(`${tag} OK [CAPABILITY ${capabilities}] Logged in`);
          return;
        case "SELECT":
        case "EXAMINE": {
          const messages = folders.get(path);
          if (!messages) {
            selected = null;
            send(`${tag} NO No such folder`);
            return;
          }
          selected = { path, write: command === "SELECT" };
          send(`* ${String(messages.length)} EXISTS`);
          send("* FLAGS (\\Seen \\Deleted)");
          send("* OK [UIDVALIDITY 1] UIDs valid");
          send(`* OK [UIDNEXT ${String(messages.length + 1)}] Next UID`);
          send(
            `${tag} OK [${selected.write ? "READ-WRITE" : "READ-ONLY"}] Done`,
          );
          return;
        }
        case "CLOSE":
        case "EXPUNGE":
          expungeSelected();
          if (command === "CLOSE") selected = null;
          break;
        case "LIST": {
          const pattern = (args[1] ?? "").replace(/^"|"$/g, "");
          if (pattern === "") send('* LIST (\\Noselect) "/" ""');
          else if (folders.has(pattern)) send(`* LIST () "/" "${pattern}"`);
          break;
        }
        case "STATUS":
          send(
            `* STATUS ${path} (MESSAGES ${String(folders.get(path)?.length ?? 0)})`,
          );
          break;
        case "RENAME": {
          const target = (args[1] ?? "").replace(/^"|"$/g, "");
          folders.set(target, folders.get(path) ?? []);
          folders.delete(path);
          break;
        }
        case "DELETE":
          folders.delete(path);
          break;
        case "LOGOUT":
          send("* BYE Bye");
          send(`${tag} OK Done`);
          socket.end();
          return;
        case "SUBSCRIBE":
        case "NOOP":
          break;
        default:
          send(`${tag} BAD Unknown command`);
          return;
      }
      send(`${tag} OK Done`);
    };
    socket.on("data", (chunk) => {
      buffered += chunk.toString("utf8");
      let end: number;
      while ((end = buffered.indexOf("\r\n")) >= 0) {
        handle(buffered.slice(0, end));
        buffered = buffered.slice(end + 2);
      }
    });
    socket.on("error", () => undefined);
    send(`* OK [CAPABILITY ${capabilities}] Ready`);
  });
  return new Promise<{ server: Server; port: number; commands: string[] }>(
    (resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (address === null || typeof address === "string") {
          throw new Error("The IMAP server has no port");
        }
        resolve({ server, port: address.port, commands });
      });
    },
  );
}

describe("imapflowConnector", () => {
  let running: Server | null = null;
  afterEach(() => {
    running?.close();
    running = null;
  });

  async function openSessionOn(
    folders: Map<string, ScriptedMail[]>,
    {
      capabilities = "IMAP4rev1 MOVE UIDPLUS",
      refuseOnce = [],
    }: { capabilities?: string; refuseOnce?: string[] } = {},
  ) {
    const started = await startImapServer(folders, capabilities, refuseOnce);
    running = started.server;
    const session = await createImapflowConnector({ tls: false })(
      { host: "127.0.0.1", port: started.port },
      { user: "me", pass: "secret" },
    );
    return { session, commands: started.commands };
  }

  it("keeps mail that another client flagged \\Deleted when it renames the open folder", async () => {
    const folders = new Map<string, ScriptedMail[]>([
      ["INBOX", []],
      ["Projects", [mail(1, ["\\Seen"]), mail(2, ["\\Deleted"])]],
    ]);
    const { session, commands } = await openSessionOn(folders);

    await session.openFolder("Projects", { write: true });
    await session.renameFolder("Projects", "Work");
    await session.close();

    expect(commands).not.toContain("CLOSE");
    expect(commands).not.toContain("EXPUNGE");
    expect(folders.get("Work")).toHaveLength(2);
  });

  it("does not delete an open folder whose only mail another client flagged \\Deleted", async () => {
    const folders = new Map<string, ScriptedMail[]>([
      ["INBOX", []],
      ["Old", [mail(1, ["\\Deleted"])]],
    ]);
    const { session, commands } = await openSessionOn(folders);

    await session.openFolder("Old", { write: true });
    await expect(session.deleteEmptyFolder("Old")).rejects.toThrow("not empty");
    await session.close();

    expect(commands).not.toContain("CLOSE");
    expect(commands).not.toContain("EXPUNGE");
    expect(folders.get("Old")).toHaveLength(1);
  });

  describe("on a server with UIDPLUS and no MOVE", () => {
    const UIDPLUS_ONLY = "IMAP4rev1 UIDPLUS";

    it("removes only the moved mail, with UID EXPUNGE, and says where it went", async () => {
      const other = mail(2, ["\\Deleted"]);
      const folders = new Map<string, ScriptedMail[]>([
        ["INBOX", [mail(1), other, mail(3)]],
        ["Archive", []],
      ]);
      const { session, commands } = await openSessionOn(folders, {
        capabilities: UIDPLUS_ONLY,
      });

      await session.openFolder("INBOX", { write: true });
      const moved = await session.moveMessages([1, 3], "Archive");
      await session.close();

      expect(commands).toContain("UID EXPUNGE 1,3");
      expect(commands).not.toContain("EXPUNGE");
      expect(commands).not.toContain("CLOSE");
      expect(folders.get("INBOX")).toEqual([other]);
      expect(folders.get("Archive")).toMatchObject([
        { messageId: "<1@x>", flags: [] },
        { messageId: "<3@x>", flags: [] },
      ]);
      expect(moved?.uidValidity).toBe(1);
      expect([...(moved?.uidMap ?? [])]).toEqual([
        [1, 100],
        [3, 101],
      ]);
    });

    it.each([
      ["the flag", ["UID STORE 1,2 +FLAGS"]],
      ["the removal", ["UID EXPUNGE"]],
    ])(
      "after a failure of %s, keeps the mail and the \\Deleted of another client",
      async (_step, refuseOnce) => {
        const folders = new Map<string, ScriptedMail[]>([
          ["INBOX", [mail(1), mail(2, ["\\Deleted"])]],
          ["Archive", []],
        ]);
        const { session } = await openSessionOn(folders, {
          capabilities: UIDPLUS_ONLY,
          refuseOnce,
        });

        await session.openFolder("INBOX", { write: true });
        await expect(session.moveMessages([1, 2], "Archive")).rejects.toThrow();
        expect(folders.get("INBOX")).toMatchObject([
          { uid: 1, flags: [] },
          { uid: 2, flags: ["\\Deleted"] },
        ]);

        await session.close();
      },
    );
  });

  it("moves nothing on a server with neither MOVE nor UIDPLUS", async () => {
    const folders = new Map<string, ScriptedMail[]>([
      ["INBOX", [mail(1), mail(2, ["\\Deleted"])]],
      ["Archive", []],
    ]);
    const { session, commands } = await openSessionOn(folders, {
      capabilities: "IMAP4rev1",
    });

    expect(session.supportsMove()).toBe(false);
    await session.openFolder("INBOX", { write: true });
    await expect(session.moveMessages([1], "Archive")).rejects.toBeInstanceOf(
      MoveUnsupportedError,
    );
    await session.close();

    expect(
      commands.filter((line) => /^(UID|EXPUNGE|CLOSE)/.test(line)),
    ).toEqual([]);
    expect(folders.get("INBOX")).toHaveLength(2);
    expect(folders.get("Archive")).toEqual([]);
  });
});
