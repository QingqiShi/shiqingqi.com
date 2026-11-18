import {
  checkAttachments,
  IMAGE_LONG_EDGE,
  MAX_PASTE_CHARS,
  type AttachmentKind,
} from "#src/assistant/check-attachments.ts";

/** A file in the prompt field, ready to send: an image is already scaled down. */
export interface DraftAttachment {
  id: string;
  name: string;
  kind: AttachmentKind;
  blob: Blob;
  /** For a pasted text: its length. */
  chars?: number;
}

/** Why a file did not go into the field. */
export type AttachFailure =
  "too_many" | "too_large" | "unsupported" | "unreadable";

const JPEG_QUALITY = 0.85;

/**
 * The image as a JPEG with its long edge at most `IMAGE_LONG_EDGE`, so that
 * a photo from a phone fits the limits. JPEG has no transparency, so the
 * image goes on white, as a screenshot shows it.
 */
async function scaleImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    const scale = Math.min(
      1,
      IMAGE_LONG_EDGE / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No 2D canvas.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("The image could not be encoded."));
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    });
  } finally {
    bitmap.close();
  }
}

function isPdf(file: File): boolean {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

/** A file that the person picked or pasted, ready for the field, or why it cannot go in. */
async function draftOf(file: File): Promise<DraftAttachment | AttachFailure> {
  const id = crypto.randomUUID();
  if (isPdf(file)) {
    return { id, name: file.name || "Document.pdf", kind: "pdf", blob: file };
  }
  if (!file.type.startsWith("image/")) return "unsupported";
  try {
    return {
      id,
      name: file.name || "Image",
      kind: "image",
      blob: await scaleImage(file),
    };
  } catch {
    return "unreadable";
  }
}

/** A long pasted text as a file for the field. */
function pastedDraft(
  text: string,
  name: string,
): DraftAttachment | AttachFailure {
  if (text.length > MAX_PASTE_CHARS) return "too_large";
  return {
    id: crypto.randomUUID(),
    name,
    kind: "text",
    blob: new Blob([text], { type: "text/plain;charset=utf-8" }),
    chars: text.length,
  };
}

/** Whether the files fit the limits together, as the server checks them again. */
function draftsFit(drafts: readonly DraftAttachment[]): AttachFailure | null {
  const refusal = checkAttachments(
    drafts.map((draft) => ({
      kind: draft.kind,
      size: draft.blob.size,
      chars: draft.chars,
    })),
  );
  if (refusal === "too_many_attachments") return "too_many";
  if (refusal === null) return null;
  return refusal === "attachment_type" ? "unsupported" : "too_large";
}

/** The files in the prompt field before they are sent. */
export const draftAttachments = { draftOf, pastedDraft, draftsFit };
