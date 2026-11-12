import {
  createHash,
  createPublicKey,
  sign,
  verify,
  type KeyObject,
} from "node:crypto";

const MACHINE_PATTERN = /^[a-z0-9-]{3,32}$/;

// The DER header of an Ed25519 SubjectPublicKeyInfo, before the 32 key bytes.
const SPKI_ED25519_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

const UPLOAD_HEADERS = {
  machine: "Buddy-Machine",
  signature: "Buddy-Signature",
} as const;

/** A signed read carries the upload headers and the time it was signed at. */
export const READ_HEADERS = { ...UPLOAD_HEADERS, at: "Buddy-At" } as const;

/**
 * The bytes that the machine signs: they bind the user, the machine and the
 * body. The body's `at` makes each upload different, so the server refuses a
 * replay by its `at`.
 */
function uploadMessage(fields: {
  user: string;
  machine: string;
  body: Uint8Array;
}) {
  const bodyHash = createHash("sha256").update(fields.body).digest("hex");
  return Buffer.from(
    ["buddy-upload-v2", fields.user, fields.machine, bodyHash].join("\n"),
  );
}

/**
 * The bytes that the machine signs for a read of its account: `at` makes the
 * signature good for the server's clock-skew window alone.
 */
export function readMessage(fields: {
  user: string;
  machine: string;
  at: number;
}) {
  return Buffer.from(
    ["buddy-read-v1", fields.user, fields.machine, String(fields.at)].join(
      "\n",
    ),
  );
}

export function publicKeyFromRaw(base64: string): KeyObject {
  const raw = Buffer.from(base64, "base64");
  if (raw.length !== 32) throw new Error("An Ed25519 public key has 32 bytes.");
  return createPublicKey({
    key: Buffer.concat([SPKI_ED25519_PREFIX, raw]),
    format: "der",
    type: "spki",
  });
}

export function rawPublicKey(key: KeyObject): string {
  const spki = key.export({ format: "der", type: "spki" });
  return spki.subarray(SPKI_ED25519_PREFIX.length).toString("base64");
}

/** The machine and signature of the headers, or null when they cannot be a signed upload. */
export function readUploadHeaders(headers: Headers) {
  const machine = headers.get(UPLOAD_HEADERS.machine) ?? "";
  const signature = Buffer.from(
    headers.get(UPLOAD_HEADERS.signature) ?? "",
    "base64",
  );
  if (!MACHINE_PATTERN.test(machine) || signature.length !== 64) return null;
  return { machine, signature };
}

/** The machine, signature and time of a signed read's headers, or null when they cannot be one. */
export function readReadHeaders(headers: Headers) {
  const signed = readUploadHeaders(headers);
  const at = headers.get(READ_HEADERS.at) ?? "";
  if (!signed || !/^\d{1,15}$/.test(at)) return null;
  return { ...signed, at: Number(at) };
}

function verifyMessage(
  message: Buffer,
  signature: Uint8Array,
  publicKey: string,
) {
  try {
    return verify(null, message, publicKeyFromRaw(publicKey), signature);
  } catch {
    return false;
  }
}

/** True when the private half of `publicKey` signed this body for `user` from `machine`. */
export function verifyUploadSignature({
  user,
  machine,
  signature,
  body,
  publicKey,
}: {
  user: string;
  machine: string;
  signature: Uint8Array;
  body: Uint8Array;
  publicKey: string;
}): boolean {
  return verifyMessage(
    uploadMessage({ user, machine, body }),
    signature,
    publicKey,
  );
}

/** True when the private half of `publicKey` signed a read of `user` from `machine` at `at`. */
export function verifyReadSignature({
  user,
  machine,
  at,
  signature,
  publicKey,
}: {
  user: string;
  machine: string;
  at: number;
  signature: Uint8Array;
  publicKey: string;
}): boolean {
  return verifyMessage(
    readMessage({ user, machine, at }),
    signature,
    publicKey,
  );
}

/** The headers of a signed upload. The Mac side does the same. */
export function signUpload({
  user,
  machine,
  privateKey,
  body,
}: {
  user: string;
  machine: string;
  privateKey: KeyObject;
  body: Uint8Array;
}): Record<string, string> {
  return {
    [UPLOAD_HEADERS.machine]: machine,
    [UPLOAD_HEADERS.signature]: sign(
      null,
      uploadMessage({ user, machine, body }),
      privateKey,
    ).toString("base64"),
  };
}
