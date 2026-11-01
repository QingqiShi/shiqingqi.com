import { createServer, type Socket } from "node:net";
import type { PGlite } from "@electric-sql/pglite";

const PROTOCOL_V3 = 196_608;
const SSL_REQUEST = 80_877_103;
const GSS_REQUEST = 80_877_104;
const CANCEL_REQUEST = 80_877_102;
const READY_FOR_QUERY = "Z".charCodeAt(0);

/** Gives the one PGlite session to one connection at a time, and keeps it there until that connection is idle again. */
class SessionLock {
  private owner: symbol | null = null;
  private readonly waiters: { id: symbol; resolve: () => void }[] = [];

  async acquire(id: symbol): Promise<void> {
    if (this.owner === id) return;
    if (this.owner === null) {
      this.owner = id;
      return;
    }
    await new Promise<void>((resolve) => {
      this.waiters.push({ id, resolve });
    });
  }

  holds(id: symbol): boolean {
    return this.owner === id;
  }

  release(id: symbol): void {
    if (this.owner !== id) return;
    const next = this.waiters.shift();
    this.owner = next?.id ?? null;
    next?.resolve();
  }
}

/**
 * Gives back the WASM stack that a failed statement leaves behind.
 * PGlite 0.5 does not reset its stack pointer after an error. Each error
 * keeps about 1 KB, and after some thousand errors every statement fails
 * with "stack depth limit exceeded". Between two top-level calls no C frame
 * is live, so the pointer from before a call is correct after it.
 */
function createStackRestorer(
  db: PGlite,
): <T>(work: () => Promise<T>) => Promise<T> {
  const pointer: unknown = Reflect.get(db.Module, "___stack_pointer");
  if (!(pointer instanceof WebAssembly.Global)) return (work) => work();
  return async (work) => {
    const saved: unknown = pointer.value;
    try {
      return await work();
    } finally {
      pointer.value = saved;
    }
  };
}

const ROLLBACK = (() => {
  const query = Buffer.from("ROLLBACK\0");
  const bytes = Buffer.alloc(5 + query.length);
  bytes.write("Q", 0);
  bytes.writeInt32BE(4 + query.length, 1);
  query.copy(bytes, 5);
  return new Uint8Array(bytes);
})();

/**
 * Passes on the backend messages in `data` except ReadyForQuery.
 * After an error, PGlite sends ReadyForQuery at the end of each call, also
 * before the client's Sync. Then the client gets two, and it gives the
 * answers of its next query to the wrong one.
 */
function createReadyForQueryFilter(write: (data: Buffer) => void) {
  let pending = Buffer.alloc(0);
  return (data: Uint8Array) => {
    pending = Buffer.concat([pending, data]);
    const kept: Buffer[] = [];
    let offset = 0;
    while (pending.length - offset >= 5) {
      const length = 1 + pending.readInt32BE(offset + 1);
      if (pending.length - offset < length) break;
      if (pending[offset] !== READY_FOR_QUERY) {
        kept.push(pending.subarray(offset, offset + length));
      }
      offset += length;
    }
    pending = Buffer.from(pending.subarray(offset));
    if (kept.length > 0) write(Buffer.concat(kept));
  };
}

type Message =
  | { kind: "startup"; bytes: Uint8Array }
  | { kind: "negotiate" }
  | { kind: "cancel" }
  | { kind: "typed"; type: string; bytes: Uint8Array };

/** Takes the complete messages from the front of `buffer`. */
function readMessages(
  buffer: Buffer,
  started: boolean,
): { messages: Message[]; rest: Buffer; started: boolean } {
  const messages: Message[] = [];
  let offset = 0;
  let isStarted = started;
  for (;;) {
    if (!isStarted) {
      if (buffer.length - offset < 8) break;
      const length = buffer.readInt32BE(offset);
      if (buffer.length - offset < length) break;
      const code = buffer.readInt32BE(offset + 4);
      const bytes = buffer.subarray(offset, offset + length);
      offset += length;
      if (code === SSL_REQUEST || code === GSS_REQUEST) {
        messages.push({ kind: "negotiate" });
      } else if (code === CANCEL_REQUEST) {
        messages.push({ kind: "cancel" });
      } else if (code === PROTOCOL_V3) {
        messages.push({ kind: "startup", bytes: new Uint8Array(bytes) });
        isStarted = true;
      } else {
        messages.push({ kind: "cancel" });
      }
      continue;
    }
    if (buffer.length - offset < 5) break;
    const length = 1 + buffer.readInt32BE(offset + 1);
    if (buffer.length - offset < length) break;
    messages.push({
      kind: "typed",
      type: String.fromCharCode(buffer[offset]),
      bytes: new Uint8Array(buffer.subarray(offset, offset + length)),
    });
    offset += length;
  }
  return { messages, rest: buffer.subarray(offset), started: isStarted };
}

export interface PgliteServer {
  close: () => Promise<void>;
}

/**
 * Serves one PGlite database over the Postgres wire protocol to many
 * connections, such as a `pg` Pool.
 *
 * PGlite has one session. A connection keeps it from its first message
 * until it is idle outside a transaction (after Sync or a simple Query),
 * so the extended-query messages and the transactions of two connections
 * never mix.
 */
export async function servePglite(
  db: PGlite,
  { host, port }: { host: string; port: number },
): Promise<PgliteServer> {
  const lock = new SessionLock();
  const sockets = new Set<Socket>();
  const restoreStack = createStackRestorer(db);
  const execute = (bytes: Uint8Array, write: (data: Uint8Array) => void) =>
    db.runExclusive(() =>
      restoreStack(() => db.execProtocolRawStream(bytes, { onRawData: write })),
    );

  const server = createServer((socket) => {
    sockets.add(socket);
    socket.setNoDelay(true);
    const id = Symbol("connection");
    let buffer = Buffer.alloc(0);
    let started = false;
    let chain = Promise.resolve();

    const run = async (message: Message) => {
      if (socket.destroyed) return;
      if (message.kind === "negotiate") {
        socket.write("N");
        return;
      }
      if (message.kind === "cancel") {
        socket.end();
        return;
      }
      if (message.kind === "typed" && message.type === "X") {
        socket.end();
        return;
      }
      const endsCycle =
        message.kind === "startup" ||
        message.type === "S" ||
        message.type === "Q";
      const write = (data: Uint8Array) => {
        if (!socket.destroyed) socket.write(Buffer.from(data));
      };
      await lock.acquire(id);
      await execute(
        message.bytes,
        endsCycle ? write : createReadyForQueryFilter(write),
      );
      if (endsCycle && !db.isInTransaction()) lock.release(id);
    };

    socket.on("data", (data) => {
      const read = readMessages(
        Buffer.concat([buffer, Buffer.from(data)]),
        started,
      );
      buffer = Buffer.from(read.rest);
      started = read.started;
      for (const message of read.messages) {
        chain = chain.then(() => run(message));
      }
      chain = chain.catch(() => {
        socket.destroy();
      });
    });

    socket.on("error", () => {
      socket.destroy();
    });

    socket.on("close", () => {
      sockets.delete(socket);
      chain = chain
        .then(async () => {
          if (lock.holds(id) && db.isInTransaction()) {
            await execute(ROLLBACK, () => undefined);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          lock.release(id);
        });
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  return {
    close: () =>
      new Promise<void>((resolve) => {
        for (const socket of sockets) socket.destroy();
        server.close(() => {
          resolve();
        });
      }),
  };
}
