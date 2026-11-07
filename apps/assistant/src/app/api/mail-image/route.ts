import { serveMailImage } from "#src/assistant/mail/images/serve-mail-image.ts";

export function GET(request: Request) {
  return serveMailImage(request, {
    secret: process.env.ASSISTANT_AUTH_SECRET,
    now: new Date(),
  });
}
