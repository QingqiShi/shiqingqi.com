import { tmpdir } from "node:os";
import path from "node:path";

/** Where the server under test writes its emails. The port keeps the runs of two worktrees apart. */
export function emailOutbox(port: string): string {
  return path.join(tmpdir(), `trips-e2e-outbox-${port}`);
}
