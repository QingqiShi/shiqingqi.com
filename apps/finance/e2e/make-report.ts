import { expect, type Page } from "@playwright/test";

function sameOrigin(page: Page) {
  return { Origin: new URL(page.url()).origin, Referer: page.url() };
}

/** Makes the Report of the week that ends on `periodEnd` through the API, as the page's Member, and returns its id. */
export async function makeReport(page: Page, periodEnd: string) {
  const response = await page.request.post("/api/reports/regenerate", {
    headers: sameOrigin(page),
    data: { periodEnd },
  });
  expect(response.status()).toBe(200);
  const body: unknown = await response.json();
  if (typeof body !== "object" || body === null || !("id" in body)) {
    throw new Error("The regenerate response has no id");
  }
  return String(body.id);
}
