import { createHash, randomBytes, webcrypto } from "node:crypto";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { isoCBOR } from "@simplewebauthn/server/helpers";

interface StoredCredential {
  id: string;
  rpId: string;
  userHandle: string;
  keyPair: webcrypto.CryptoKeyPair;
  signCount: number;
}

const FLAG_USER_PRESENT = 0x01;
const FLAG_USER_VERIFIED = 0x04;
const FLAG_ATTESTED_CREDENTIAL = 0x40;

function sha256(data: Uint8Array | string): Buffer {
  return createHash("sha256").update(data).digest();
}

function uint32(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value);
  return buffer;
}

function clientData(type: string, challenge: string, origin: string): Buffer {
  return Buffer.from(
    JSON.stringify({ type, challenge, origin, crossOrigin: false }),
  );
}

function derInteger(bytes: Uint8Array): Buffer {
  let start = 0;
  while (start < bytes.length - 1 && bytes[start] === 0) start += 1;
  const trimmed = Buffer.from(bytes.subarray(start));
  const value =
    trimmed.readUInt8(0) & 0x80
      ? Buffer.concat([Buffer.of(0), trimmed])
      : trimmed;
  return Buffer.concat([Buffer.of(0x02, value.length), value]);
}

/** WebCrypto signs ECDSA as raw r‖s; WebAuthn sends DER. */
function rawToDer(raw: ArrayBuffer): Buffer {
  const bytes = new Uint8Array(raw);
  const sequence = Buffer.concat([
    derInteger(bytes.subarray(0, 32)),
    derInteger(bytes.subarray(32)),
  ]);
  return Buffer.concat([Buffer.of(0x30, sequence.length), sequence]);
}

/**
 * A platform authenticator in software: ES256 keys from WebCrypto, `none`
 * attestation, and assertions that `@simplewebauthn/server` verifies for real.
 */
export function createSoftwareAuthenticator() {
  const credentials: StoredCredential[] = [];

  return {
    credentials,

    async register(
      options: PublicKeyCredentialCreationOptionsJSON,
      origin: string,
    ): Promise<RegistrationResponseJSON> {
      const rpId = options.rp.id ?? new URL(origin).hostname;
      const keyPair = await webcrypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"],
      );
      const jwk = await webcrypto.subtle.exportKey("jwk", keyPair.publicKey);
      const credentialId = randomBytes(16);
      const id = credentialId.toString("base64url");
      credentials.push({
        id,
        rpId,
        userHandle: options.user.id,
        keyPair,
        signCount: 0,
      });

      const cosePublicKey = isoCBOR.encode(
        new Map<number, number | Uint8Array>([
          [1, 2],
          [3, -7],
          [-1, 1],
          [-2, new Uint8Array(Buffer.from(jwk.x ?? "", "base64url"))],
          [-3, new Uint8Array(Buffer.from(jwk.y ?? "", "base64url"))],
        ]),
      );
      const credentialIdLength = Buffer.alloc(2);
      credentialIdLength.writeUInt16BE(credentialId.length);
      const authData = Buffer.concat([
        sha256(rpId),
        Buffer.of(
          FLAG_USER_PRESENT | FLAG_USER_VERIFIED | FLAG_ATTESTED_CREDENTIAL,
        ),
        uint32(0),
        Buffer.alloc(16),
        credentialIdLength,
        credentialId,
        cosePublicKey,
      ]);
      const attestationObject = isoCBOR.encode(
        new Map<string, string | Map<string, string> | Uint8Array>([
          ["fmt", "none"],
          ["attStmt", new Map<string, string>()],
          ["authData", new Uint8Array(authData)],
        ]),
      );

      return {
        id,
        rawId: id,
        type: "public-key",
        authenticatorAttachment: "platform",
        clientExtensionResults: {},
        response: {
          clientDataJSON: clientData(
            "webauthn.create",
            options.challenge,
            origin,
          ).toString("base64url"),
          attestationObject:
            Buffer.from(attestationObject).toString("base64url"),
          transports: ["internal", "hybrid"],
        },
      };
    },

    async authenticate(
      options: PublicKeyCredentialRequestOptionsJSON,
      origin: string,
      credentialId?: string,
    ): Promise<AuthenticationResponseJSON> {
      const rpId = options.rpId ?? new URL(origin).hostname;
      const credential = credentials.find(
        (candidate) =>
          candidate.rpId === rpId &&
          (credentialId === undefined || candidate.id === credentialId),
      );
      if (!credential) throw new Error("No credential for this relying party");
      credential.signCount += 1;

      const authData = Buffer.concat([
        sha256(rpId),
        Buffer.of(FLAG_USER_PRESENT | FLAG_USER_VERIFIED),
        uint32(credential.signCount),
      ]);
      const clientDataJSON = clientData(
        "webauthn.get",
        options.challenge,
        origin,
      );
      const signature = await webcrypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        credential.keyPair.privateKey,
        Buffer.concat([authData, sha256(clientDataJSON)]),
      );

      return {
        id: credential.id,
        rawId: credential.id,
        type: "public-key",
        authenticatorAttachment: "platform",
        clientExtensionResults: {},
        response: {
          clientDataJSON: clientDataJSON.toString("base64url"),
          authenticatorData: authData.toString("base64url"),
          signature: rawToDer(signature).toString("base64url"),
          userHandle: credential.userHandle,
        },
      };
    },
  };
}
