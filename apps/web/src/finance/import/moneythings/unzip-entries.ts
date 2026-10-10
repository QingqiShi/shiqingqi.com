import { inflateRawSync } from "node:zlib";

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;
const STORED = 0;
const DEFLATED = 8;

function findEndOfCentralDirectory(zip: Buffer): number {
  const earliest = Math.max(0, zip.length - 22 - 0xffff);
  for (let offset = zip.length - 22; offset >= earliest; offset--) {
    if (zip.readUInt32LE(offset) === END_OF_CENTRAL_DIRECTORY) return offset;
  }
  throw new Error("Not a zip file: no end of central directory");
}

/**
 * The uncompressed contents of the zip entries whose names pass `wanted`.
 * Supports stored and deflated entries, which is what MoneyThings writes.
 */
export function unzipEntries(
  zip: Buffer,
  wanted: (name: string) => boolean,
): Map<string, Buffer> {
  const end = findEndOfCentralDirectory(zip);
  const count = zip.readUInt16LE(end + 10);
  let offset = zip.readUInt32LE(end + 16);
  const files = new Map<string, Buffer>();

  for (let i = 0; i < count; i++) {
    if (zip.readUInt32LE(offset) !== CENTRAL_DIRECTORY_HEADER) {
      throw new Error("Corrupt zip: bad central directory header");
    }
    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const size = zip.readUInt32LE(offset + 24);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localOffset = zip.readUInt32LE(offset + 42);
    const name = zip.toString("utf8", offset + 46, offset + 46 + nameLength);
    offset += 46 + nameLength + extraLength + commentLength;

    if (!wanted(name)) continue;
    if (zip.readUInt32LE(localOffset) !== LOCAL_FILE_HEADER) {
      throw new Error(`Corrupt zip: bad local header for ${name}`);
    }
    const dataStart =
      localOffset +
      30 +
      zip.readUInt16LE(localOffset + 26) +
      zip.readUInt16LE(localOffset + 28);
    const data = zip.subarray(dataStart, dataStart + compressedSize);
    if (method === STORED) {
      files.set(name, Buffer.from(data));
    } else if (method === DEFLATED) {
      files.set(name, inflateRawSync(data));
    } else {
      throw new Error(`Unsupported zip compression ${String(method)}: ${name}`);
    }
    if (files.get(name)?.length !== size) {
      throw new Error(`Corrupt zip: wrong size for ${name}`);
    }
  }
  return files;
}
