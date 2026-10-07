import { test, expect, type Request } from "@playwright/test";

const REPLY = "Try Arrival for a quiet, cerebral night in.";

/** A fixed reply in the AI SDK UI message stream wire format. */
const replyStream = [
  { type: "start", messageId: "e2e-reply" },
  { type: "start-step" },
  { type: "text-start", id: "0" },
  { type: "text-delta", id: "0", delta: REPLY },
  { type: "text-end", id: "0" },
  {
    type: "message-metadata",
    messageMetadata: { sessionId: "00000000-0000-4000-8000-000000000000" },
  },
  { type: "finish-step" },
  { type: "finish", finishReason: "stop" },
]
  .map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)
  .concat("data: [DONE]\n\n")
  .join("");

test.describe("Movie Database Chat", () => {
  test("sends a message and renders the AI reply", async ({ page }) => {
    await page.route("**/api/ai-chat", (route) =>
      route.fulfill({
        status: 200,
        headers: {
          "content-type": "text/event-stream",
          "x-vercel-ai-ui-message-stream": "v1",
        },
        body: replyStream,
      }),
    );
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const chatRequests: Request[] = [];
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname === "/api/ai-chat"
      ) {
        chatRequests.push(request);
      }
    });

    await page.goto("/movie-database");
    const input = page.getByRole("textbox", {
      name: "Ask about movies and TV shows...",
    });
    await input.fill("Something calm for tonight");
    await input.press("Enter");

    await expect
      .poll(() => ({ pageErrors, requestCount: chatRequests.length }))
      .toEqual({ pageErrors: [], requestCount: 1 });
    expect(chatRequests[0].postDataJSON()).toMatchObject({
      message: {
        role: "user",
        parts: expect.arrayContaining([
          { type: "text", text: "Something calm for tonight" },
        ]),
      },
    });
    await expect(page.getByText(REPLY)).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
