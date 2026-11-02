import { createServer, type Server } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createImapflowConnector } from "#src/assistant/mail/imap/imapflow-connector.ts";

const CAPABILITIES = "IMAP4rev1 MOVE UIDPLUS";

/**
 * A scripted IMAP server without UNSELECT. Like a real server, CLOSE and
 * EXPUNGE remove the mail flagged \Deleted from a folder selected for writes.
 */
function startImapServer(folders: Map<string, string[][]>) {
  const commands: string[] = [];
  const server = createServer((socket) => {
    let selected: { path: string; write: boolean } | null = null;
    let buffered = "";
    const send = (line: string) => socket.write(`${line}\r\n`);
    const expungeSelected = () => {
      if (!selected?.write) return;
      const kept = (folders.get(selected.path) ?? []).filter(
        (flags) => !flags.includes("\\Deleted"),
      );
      folders.set(selected.path, kept);
    };
    const handle = (line: string) => {
      const [tag = "", name = "", ...args] = line.split(" ");
      const command = name.toUpperCase();
      const path = (args[0] ?? "").replace(/^"|"$/g, "");
      commands.push(command);
      switch (command) {
        case "CAPABILITY":
          send(`* CAPABILITY ${CAPABILITIES}`);
          break;
        case "LOGIN":
          send(`${tag} OK [CAPABILITY ${CAPABILITIES}] Logged in`);
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
    send(`* OK [CAPABILITY ${CAPABILITIES}] Ready`);
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

  async function openSessionOn(folders: Map<string, string[][]>) {
    const started = await startImapServer(folders);
    running = started.server;
    const session = await createImapflowConnector({ tls: false })(
      { host: "127.0.0.1", port: started.port },
      { user: "me", pass: "secret" },
    );
    return { session, commands: started.commands };
  }

  it("keeps mail that another client flagged \\Deleted when it renames the open folder", async () => {
    const folders = new Map([
      ["INBOX", []],
      ["Projects", [["\\Seen"], ["\\Deleted"]]],
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
    const folders = new Map([
      ["INBOX", []],
      ["Old", [["\\Deleted"]]],
    ]);
    const { session, commands } = await openSessionOn(folders);

    await session.openFolder("Old", { write: true });
    await expect(session.deleteEmptyFolder("Old")).rejects.toThrow("not empty");
    await session.close();

    expect(commands).not.toContain("CLOSE");
    expect(commands).not.toContain("EXPUNGE");
    expect(folders.get("Old")).toHaveLength(1);
  });
});
