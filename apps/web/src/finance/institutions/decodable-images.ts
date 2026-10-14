export type ImageFormat = "png" | "jpeg" | "gif" | "webp" | "ico";

/** Bytes that sharp decodes as they are, or raw RGBA pixels with their size. */
export type DecodableImage =
  | { kind: "encoded"; data: Uint8Array }
  | { kind: "rgba"; data: Uint8Array; width: number; height: number };

const ICO_HEADER_BYTES = 6;
const ICO_ENTRY_BYTES = 16;
const DIB_HEADER_BYTES = 40;
const BITFIELD_MASKS_BYTES = 12;
const MAX_ICO_EDGE = 256;
const BI_RGB = 0;
const BI_BITFIELDS = 3;

function startsWith(bytes: Uint8Array, prefix: number[], at = 0) {
  return prefix.every((byte, index) => bytes[at + index] === byte);
}

function ascii(text: string) {
  return Array.from(Buffer.from(text, "latin1"));
}

function isPng(bytes: Uint8Array) {
  return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

/** The format the magic bytes say, whatever the URL or Content-Type claim; null for anything else, SVG included. */
export function sniffImageFormat(bytes: Uint8Array): ImageFormat | null {
  if (isPng(bytes)) return "png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (
    startsWith(bytes, ascii("GIF87a")) ||
    startsWith(bytes, ascii("GIF89a"))
  ) {
    return "gif";
  }
  if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) {
    return "webp";
  }
  if (
    bytes.length >= ICO_HEADER_BYTES &&
    startsWith(bytes, [0x00, 0x00, 0x01, 0x00]) &&
    (bytes[4] !== 0 || bytes[5] !== 0)
  ) {
    return "ico";
  }
  return null;
}

function viewOf(bytes: Uint8Array) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

interface IcoEntry {
  edge: number;
  bitCount: number;
  data: Uint8Array;
}

function readIcoEntries(bytes: Uint8Array): IcoEntry[] {
  const view = viewOf(bytes);
  const count = view.getUint16(4, true);
  const entries: IcoEntry[] = [];
  for (let index = 0; index < count; index++) {
    const at = ICO_HEADER_BYTES + index * ICO_ENTRY_BYTES;
    if (at + ICO_ENTRY_BYTES > bytes.length) break;
    const width = view.getUint8(at) || MAX_ICO_EDGE;
    const height = view.getUint8(at + 1) || MAX_ICO_EDGE;
    const bitCount = view.getUint16(at + 6, true);
    const size = view.getUint32(at + 8, true);
    const offset = view.getUint32(at + 12, true);
    if (size === 0 || offset + size > bytes.length) continue;
    entries.push({
      edge: Math.min(width, height),
      bitCount,
      data: bytes.subarray(offset, offset + size),
    });
  }
  return entries.sort((a, b) => b.edge - a.edge || b.bitCount - a.bitCount);
}

function maskBitIsSet(
  data: Uint8Array,
  maskStart: number,
  maskStride: number,
  row: number,
  x: number,
) {
  const byte = data[maskStart + row * maskStride + (x >> 3)] ?? 0;
  return (byte & (0x80 >> (x & 7))) !== 0;
}

/** A 24-bit or 32-bit BI_RGB/BI_BITFIELDS icon bitmap as RGBA; null for other depths. */
export function decodeIconBitmap(
  data: Uint8Array,
): Extract<DecodableImage, { kind: "rgba" }> | null {
  if (data.length < DIB_HEADER_BYTES) return null;
  const view = viewOf(data);
  const headerBytes = view.getUint32(0, true);
  const width = view.getInt32(4, true);
  const doubledHeight = view.getInt32(8, true);
  const bitCount = view.getUint16(14, true);
  const compression = view.getUint32(16, true);
  const height = Math.floor(Math.abs(doubledHeight) / 2);
  if (headerBytes < DIB_HEADER_BYTES || headerBytes > data.length) return null;
  if (width <= 0 || width > MAX_ICO_EDGE) return null;
  if (height <= 0 || height > MAX_ICO_EDGE) return null;
  if (bitCount !== 32 && bitCount !== 24) return null;
  const isBitfields = compression === BI_BITFIELDS && bitCount === 32;
  if (compression !== BI_RGB && !isBitfields) return null;

  const pixelStart =
    headerBytes +
    (isBitfields && headerBytes === DIB_HEADER_BYTES
      ? BITFIELD_MASKS_BYTES
      : 0);
  const bytesPerPixel = bitCount / 8;
  const stride = Math.ceil((width * bytesPerPixel) / 4) * 4;
  const maskStart = pixelStart + stride * height;
  const maskStride = Math.ceil(width / 32) * 4;
  if (maskStart > data.length) return null;
  const hasMask = maskStart + maskStride * height <= data.length;
  const bottomUp = doubledHeight > 0;

  const rgba = new Uint8Array(width * height * 4);
  let hasAlpha = false;
  for (let y = 0; y < height; y++) {
    const row = bottomUp ? height - 1 - y : y;
    for (let x = 0; x < width; x++) {
      const from = pixelStart + row * stride + x * bytesPerPixel;
      const to = (y * width + x) * 4;
      rgba[to] = data[from + 2] ?? 0;
      rgba[to + 1] = data[from + 1] ?? 0;
      rgba[to + 2] = data[from] ?? 0;
      const alpha = bitCount === 32 ? (data[from + 3] ?? 0) : 255;
      rgba[to + 3] = alpha;
      if (bitCount === 32 && alpha !== 0) hasAlpha = true;
    }
  }

  if (!hasAlpha) {
    for (let y = 0; y < height; y++) {
      const row = bottomUp ? height - 1 - y : y;
      for (let x = 0; x < width; x++) {
        const transparent =
          hasMask && maskBitIsSet(data, maskStart, maskStride, row, x);
        rgba[(y * width + x) * 4 + 3] = transparent ? 0 : 255;
      }
    }
  }
  return { kind: "rgba", data: rgba, width, height };
}

/**
 * What to hand sharp for these bytes, best first: the image itself, or for an
 * ICO each usable entry from the largest down.
 */
export function decodableImages(bytes: Uint8Array): DecodableImage[] {
  const format = sniffImageFormat(bytes);
  if (format === null) return [];
  if (format !== "ico") return [{ kind: "encoded", data: bytes }];
  const images: DecodableImage[] = [];
  for (const entry of readIcoEntries(bytes)) {
    if (isPng(entry.data)) {
      images.push({ kind: "encoded", data: entry.data });
      continue;
    }
    const bitmap = decodeIconBitmap(entry.data);
    if (bitmap) images.push(bitmap);
  }
  return images;
}
