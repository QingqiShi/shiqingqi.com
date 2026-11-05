import {
  readRowShape,
  ROW_SHAPE_HEADER,
  ROW_SHAPE_MISMATCH_STATUS,
} from "../sync/replica-row-shape.ts";
import type { SyncProblem } from "./types.ts";

export const BACKOFF_MAX_MS = 60_000;

export class SyncHttpError extends Error {
  readonly status: number;
  /** How long the server asked us to wait, from `Retry-After`. */
  readonly retryAfterMs: number;

  constructor(status: number, retryAfterMs = 0) {
    super(`Sync request failed with ${String(status)}`);
    this.name = "SyncHttpError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

export class RowShapeError extends Error {
  readonly serverRowShape: number;
  readonly serverIsNewer: boolean;

  constructor(serverRowShape: number, rowShape: number) {
    super(
      `The server has row shape ${String(serverRowShape)}, not ${String(rowShape)}`,
    );
    this.name = "RowShapeError";
    this.serverRowShape = serverRowShape;
    this.serverIsNewer = serverRowShape > rowShape;
  }
}

function retryAfterMsOf(response: Response): number {
  const seconds = Number(response.headers.get("Retry-After"));
  return Number.isFinite(seconds) && seconds > 0
    ? Math.min(seconds * 1_000, BACKOFF_MAX_MS * 5)
    : 0;
}

export function httpError(response: Response) {
  return new SyncHttpError(response.status, retryAfterMsOf(response));
}

export function isUnauthorised(error: unknown) {
  return error instanceof SyncHttpError && error.status === 401;
}

export function problemOf(error: unknown, online: boolean): SyncProblem {
  if (!online) return "offline";
  if (error instanceof RowShapeError) {
    return error.serverIsNewer ? "outdated" : "server-behind";
  }
  if (error instanceof SyncHttpError) {
    if (error.status === 401) return "unauthorised";
    if (error.status === 503) return "not-configured";
    if (error.status === 429) return "busy";
  }
  return "server";
}

export function createSyncSender(request: typeof fetch, rowShape: number) {
  return async function send(url: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    headers.set(ROW_SHAPE_HEADER, String(rowShape));
    const response = await request(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...init,
      headers,
    });
    if (response.status === 401) {
      throw new SyncHttpError(401);
    }
    if (response.ok || response.status === ROW_SHAPE_MISMATCH_STATUS) {
      const serverRowShape = readRowShape(response.headers);
      if (serverRowShape !== undefined && serverRowShape !== rowShape) {
        throw new RowShapeError(serverRowShape, rowShape);
      }
    }
    return response;
  };
}

export type SyncSender = ReturnType<typeof createSyncSender>;
