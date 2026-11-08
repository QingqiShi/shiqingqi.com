export function hashOf(...parts: Array<string | number>) {
  let hash = 0;
  for (const ch of parts.join("|"))
    hash = (Math.imul(hash, 31) + ch.charCodeAt(0)) | 0;

  return (hash >>> 0).toString(36);
}
