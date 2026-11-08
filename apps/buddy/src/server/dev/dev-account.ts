import { createHash, createPrivateKey, createPublicKey } from "node:crypto";
import { rawPublicKey } from "../upload/verify-upload-signature.ts";

// The DER header of an Ed25519 PKCS #8 private key, before the 32 seed bytes.
const PKCS8_ED25519_PREFIX = Buffer.from(
  "302e020100300506032b657004220420",
  "hex",
);

function privateKey() {
  const seed = createHash("sha256").update("buddy dev upload key").digest();
  return createPrivateKey({
    key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]),
    format: "der",
    type: "pkcs8",
  });
}

/**
 * The account that the dev database seeds, which the memory store's fixture
 * belongs to, and its Mac `dev-mac`. Anyone can derive the Mac's key pair
 * from this file; only the local dev database of `pnpm dev` holds its public
 * key, so a deployment never accepts it.
 */
export const devAccount = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "qingqi",
  email: "qingqi@buddy.invalid",
  machine: "dev-mac",
  privateKey,
  publicKey: () => rawPublicKey(createPublicKey(privateKey())),
};
