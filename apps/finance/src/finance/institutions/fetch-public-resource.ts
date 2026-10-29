import {
  request as httpRequest,
  type ClientRequest,
  type IncomingMessage,
} from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { pipeline, type Readable } from "node:stream";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";

const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 8_000;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

export interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

/** Every address a host name resolves to. */
export type LookupAddresses = (hostname: string) => Promise<ResolvedAddress[]>;

/** What a request may reach, and until when. */
export interface PublicFetchPolicy {
  lookup: LookupAddresses;
  isAllowedAddress: (address: string, family: 4 | 6) => boolean;
  /** URL `port` values a request may use; `""` is the scheme's default port. */
  allowedPorts: ReadonlySet<string>;
  /** Epoch milliseconds after which no request starts or continues. */
  endsAt: number;
  signal?: AbortSignal;
}

export interface ResourceLimits {
  accept: string;
  maxBytes: number;
  /** `truncate` keeps the first `maxBytes`; `reject` gives up on the response. */
  onOverflow: "truncate" | "reject";
}

export interface PublicResource {
  /** The URL after redirects. */
  url: URL;
  body: Uint8Array;
}

type RawResponse =
  { ok: true; body: Uint8Array } | { ok: false; location: string | undefined };

class RefusedRequest extends Error {}

function isIpLiteral(hostname: string) {
  return hostname.startsWith("[") || isIP(hostname) !== 0;
}

function isLocalName(hostname: string) {
  const name = hostname.replace(/\.$/, "");
  return (
    name === "localhost" || name.endsWith(".localhost") || !name.includes(".")
  );
}

function checkUrl(url: URL, policy: PublicFetchPolicy) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new RefusedRequest(`The scheme ${url.protocol} is not allowed`);
  }
  if (url.username !== "" || url.password !== "") {
    throw new RefusedRequest("Credentials in a URL are not allowed");
  }
  if (!policy.allowedPorts.has(url.port)) {
    throw new RefusedRequest(`The port ${url.port} is not allowed`);
  }
  if (isIpLiteral(url.hostname) || isLocalName(url.hostname)) {
    throw new RefusedRequest(`The host ${url.hostname} is not allowed`);
  }
}

async function resolveAllowed(hostname: string, policy: PublicFetchPolicy) {
  const addresses = await policy.lookup(hostname);
  if (addresses.length === 0) {
    throw new RefusedRequest(`${hostname} has no addresses`);
  }
  for (const { address, family } of addresses) {
    if (!policy.isAllowedAddress(address, family)) {
      throw new RefusedRequest(`${hostname} resolves to ${address}`);
    }
  }
  return addresses;
}

/** A `lookup` for the socket that answers only with the addresses already checked. */
function pinnedLookup(addresses: ResolvedAddress[]): LookupFunction {
  return (_hostname, options, callback) => {
    const wanted =
      options.family === 4 || options.family === 6
        ? addresses.filter(({ family }) => family === options.family)
        : addresses;
    if (wanted.length === 0) {
      callback(new RefusedRequest("No checked address of that family"), "");
    } else if (options.all) {
      callback(null, wanted);
    } else {
      const [first] = wanted;
      callback(null, first.address, first.family);
    }
  };
}

function decoderFor(encoding: string | undefined) {
  switch (encoding?.trim().toLowerCase()) {
    case undefined:
    case "":
    case "identity":
      return null;
    case "gzip":
    case "x-gzip":
      return createGunzip();
    case "deflate":
      return createInflate();
    case "br":
      return createBrotliDecompress();
    default:
      throw new RefusedRequest(`The encoding ${String(encoding)} is unknown`);
  }
}

async function readBody(response: IncomingMessage, limits: ResourceLimits) {
  const declared = Number(response.headers["content-length"]);
  if (limits.onOverflow === "reject" && declared > limits.maxBytes) {
    throw new RefusedRequest(
      `The body of ${String(declared)} bytes is too big`,
    );
  }
  const decoder = decoderFor(response.headers["content-encoding"]);
  const source: Readable = decoder
    ? pipeline(response, decoder, () => {})
    : response;

  const chunks: Uint8Array[] = [];
  let length = 0;
  for await (const data of source) {
    const chunk: unknown = data;
    if (!Buffer.isBuffer(chunk)) {
      throw new RefusedRequest("The body stream gave no bytes");
    }
    length += chunk.length;
    if (length > limits.maxBytes) {
      if (limits.onOverflow === "reject") {
        throw new RefusedRequest("The body is too big");
      }
      chunks.push(chunk.subarray(0, chunk.length - (length - limits.maxBytes)));
      break;
    }
    chunks.push(chunk);
  }
  return new Uint8Array(Buffer.concat(chunks));
}

function abortError(policy: PublicFetchPolicy) {
  const reason: unknown = policy.signal?.reason;
  return reason instanceof Error
    ? reason
    : new RefusedRequest("The request took too long");
}

async function getOnce(
  url: URL,
  policy: PublicFetchPolicy,
  limits: ResourceLimits,
): Promise<RawResponse> {
  const timeLeft = Math.min(REQUEST_TIMEOUT_MS, policy.endsAt - Date.now());
  if (timeLeft <= 0) throw new RefusedRequest("No time is left");
  checkUrl(url, policy);
  const addresses = await resolveAllowed(url.hostname, policy);

  const send = url.protocol === "https:" ? httpsRequest : httpRequest;
  let request: ClientRequest | undefined;
  let response: IncomingMessage | undefined;
  const stop = () => {
    const error = abortError(policy);
    response?.destroy(error);
    request?.destroy(error);
  };
  const timer = setTimeout(stop, timeLeft);
  policy.signal?.addEventListener("abort", stop);
  try {
    response = await new Promise<IncomingMessage>((resolve, reject) => {
      request = send(
        url,
        {
          method: "GET",
          agent: false,
          lookup: pinnedLookup(addresses),
          headers: {
            "User-Agent": USER_AGENT,
            Accept: limits.accept,
            "Accept-Language": "en-GB,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
          },
        },
        resolve,
      );
      request.on("error", reject);
      request.end();
    });
    const { statusCode = 0, headers } = response;
    if (statusCode >= 200 && statusCode < 300) {
      return { ok: true, body: await readBody(response, limits) };
    }
    const isRedirect = statusCode >= 300 && statusCode < 400;
    return { ok: false, location: isRedirect ? headers.location : undefined };
  } finally {
    clearTimeout(timer);
    policy.signal?.removeEventListener("abort", stop);
    response?.destroy();
  }
}

/**
 * GETs `url` within `policy`, following up to five redirects and checking
 * each one again. Null for any failure or non-2xx answer; throws only when
 * `policy.signal` aborts.
 */
export async function fetchPublicResource(
  url: URL,
  policy: PublicFetchPolicy,
  limits: ResourceLimits,
): Promise<PublicResource | null> {
  let current = url;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const response = await getOnce(current, policy, limits);
      if (response.ok) return { url: current, body: response.body };
      if (response.location === undefined) return null;
      current = new URL(response.location, current);
    }
    return null;
  } catch {
    if (policy.signal?.aborted) throw abortError(policy);
    return null;
  }
}
