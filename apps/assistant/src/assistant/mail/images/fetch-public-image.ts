import { lookup as dnsLookup } from "node:dns/promises";
import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { isPublicAddress } from "./is-public-address.ts";

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 10_000;
/** Below the 4.5 MB limit of a Vercel Function response. */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** Raster images only: an SVG can hold scripts and links. */
const IMAGE_TYPES = new Set([
  "image/apng",
  "image/avif",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/vnd.microsoft.icon",
  "image/webp",
  "image/x-icon",
]);

const REQUEST_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; MailImageProxy/1.0)",
  Accept: "image/avif,image/webp,image/apng,image/png,image/jpeg,image/gif",
  "Accept-Encoding": "identity",
};

export interface ResolvedAddress {
  address: string;
  family: number;
}

export interface FetchImageOptions {
  /** DNS, `dns.lookup` with every address by default. */
  resolve?: (hostname: string) => Promise<ResolvedAddress[]>;
  /** Which addresses the fetch may connect to: public ones by default. */
  isAllowedAddress?: (address: string) => boolean;
}

type FetchImageResult =
  | { ok: true; contentType: string; body: Buffer<ArrayBuffer> }
  | {
      ok: false;
      reason: "refused" | "not-image" | "too-large" | "failed";
    };

class RefusedTarget extends Error {}

function resolveAll(hostname: string) {
  return dnsLookup(hostname, { all: true, order: "verbatim" });
}

/*
 * Node calls this lookup when it opens the socket, so the address it checks
 * is the address it connects to, and a DNS answer that changes between a
 * check and the connect (DNS rebinding) cannot pass. It refuses a name when
 * one of its addresses is not allowed, because Node can try each of them.
 */
function guardedLookup(
  resolve: NonNullable<FetchImageOptions["resolve"]>,
  isAllowedAddress: NonNullable<FetchImageOptions["isAllowedAddress"]>,
): LookupFunction {
  return (hostname, options, callback) => {
    resolve(hostname).then(
      (addresses) => {
        const first = addresses.at(0);
        if (
          !first ||
          addresses.some(({ address }) => !isAllowedAddress(address))
        ) {
          callback(new RefusedTarget(), "", 0);
        } else if (options.all) {
          callback(null, addresses);
        } else {
          callback(null, first.address, first.family);
        }
      },
      (error: unknown) => {
        callback(
          error instanceof Error ? error : new Error(String(error)),
          "",
          0,
        );
      },
    );
  };
}

function targetOf(raw: string, isAllowedAddress: (a: string) => boolean) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && !isAllowedAddress(host)) return null;
  return url;
}

/*
 * Node does not call `lookup` for a host that is an IP address, so
 * `targetOf` checks such a host before this request.
 */
function get(url: URL, lookup: LookupFunction, signal: AbortSignal) {
  const transport = url.protocol === "https:" ? https : http;
  return new Promise<IncomingMessage>((resolve, reject) => {
    const request = transport.get(url, {
      agent: false,
      headers: REQUEST_HEADERS,
      lookup,
      signal,
    });
    request.on("response", resolve);
    request.on("error", reject);
  });
}

async function readBody(response: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of response) {
    if (!Buffer.isBuffer(chunk)) throw new Error("Expected a byte stream");
    const buffer = chunk;
    size += buffer.length;
    if (size > MAX_IMAGE_BYTES) {
      response.destroy();
      return null;
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

/**
 * GET an image from the public internet for the mail page. Only http and
 * https; every hop of up to 5 redirects goes through
 * the same address check, at connect time. It sends no cookie, Referer or
 * header of the browser, and takes a raster image of up to 4 MB in 10 s.
 */
export async function fetchPublicImage(
  raw: string,
  {
    resolve = resolveAll,
    isAllowedAddress = isPublicAddress,
  }: FetchImageOptions = {},
): Promise<FetchImageResult> {
  const lookup = guardedLookup(resolve, isAllowedAddress);
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let next: string = raw;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const url = targetOf(next, isAllowedAddress);
      if (!url) return { ok: false, reason: "refused" };
      const response = await get(url, lookup, signal);
      const location = response.headers.location;
      if (REDIRECT_STATUSES.has(response.statusCode ?? 0) && location) {
        response.destroy();
        next = new URL(location, url).href;
        continue;
      }
      if (response.statusCode !== 200) {
        response.destroy();
        return { ok: false, reason: "failed" };
      }
      const contentType = (response.headers["content-type"] ?? "")
        .split(";")[0]
        ?.trim()
        .toLowerCase();
      const encoding = response.headers["content-encoding"];
      if (
        !contentType ||
        !IMAGE_TYPES.has(contentType) ||
        (encoding && encoding !== "identity")
      ) {
        response.destroy();
        return { ok: false, reason: "not-image" };
      }
      if (Number(response.headers["content-length"]) > MAX_IMAGE_BYTES) {
        response.destroy();
        return { ok: false, reason: "too-large" };
      }
      const body = await readBody(response);
      if (!body) return { ok: false, reason: "too-large" };
      return { ok: true, contentType, body };
    }
    return { ok: false, reason: "failed" };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof RefusedTarget ? "refused" : "failed",
    };
  }
}
