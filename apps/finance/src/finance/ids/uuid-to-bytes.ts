export function uuidToBytes(uuid: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(Buffer.from(uuid.replaceAll("-", ""), "hex"));
}
