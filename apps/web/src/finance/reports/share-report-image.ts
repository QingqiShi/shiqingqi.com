/** The parts of `navigator` that sharing a file needs. */
export interface FileShareTarget {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
}

/**
 * - `shared`: the share sheet took the file.
 * - `cancelled`: the visitor closed the share sheet.
 * - `retry`: the browser refused the share because too much time went by
 *   since the tap; a second tap works, because the image is then at hand.
 * - `downloaded`: the browser cannot share files, so the image was saved.
 */
/** True when the browser can put a file in its share sheet. */
export function canShareFiles(
  target: FileShareTarget,
  file: File = new File([], "report.png", { type: "image/png" }),
): boolean {
  if (target.share === undefined || target.canShare === undefined) {
    return false;
  }
  try {
    return target.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : "";
}

/** Shares a Report image through the share sheet, or saves it when the browser cannot share files. */
export async function shareReportImage(
  image: Blob,
  {
    fileName,
    title,
    target,
    download,
  }: {
    fileName: string;
    title: string;
    target: FileShareTarget;
    download: (image: Blob, fileName: string) => void;
  },
): Promise<"shared" | "cancelled" | "retry" | "downloaded"> {
  const file = new File([image], fileName, { type: "image/png" });
  if (target.share === undefined || !canShareFiles(target, file)) {
    download(image, fileName);
    return "downloaded";
  }
  try {
    await target.share({ files: [file], title });
    return "shared";
  } catch (error) {
    const name = errorName(error);
    if (name === "AbortError") return "cancelled";
    if (name === "NotAllowedError") return "retry";
    download(image, fileName);
    return "downloaded";
  }
}
