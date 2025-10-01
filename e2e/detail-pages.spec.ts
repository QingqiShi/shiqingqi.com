import { test, expect } from "@playwright/test";

test.describe("Experience Detail Pages", () => {
  test("should display headers with type, company, role, and dates for all experience pages", async ({
    page,
  }) => {
    // Verify Citadel page
    await page.goto("/en/experiences/citadel");
    await expect(
      page.getByRole("heading", { level: 2, name: /experience.*citadel/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const timeElement = page.locator("time");
    await expect(timeElement).toBeVisible();
    await expect(timeElement).toContainText(/\d{4}/); // Should contain a year

    // Verify Spotify page
    await page.goto("/en/experiences/spotify");
    await expect(
      page.getByRole("heading", { level: 2, name: /experience.*spotify/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("time")).toBeVisible();

    // Verify Wunderman Thompson Commerce page
    await page.goto("/en/experiences/wunderman-thompson-commerce");
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /experience.*wunderman thompson commerce/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("time")).toBeVisible();
  });

  test("should display content and technology for all experience pages", async ({
    page,
  }) => {
    // Verify Citadel page content and technology
    await page.goto("/en/experiences/citadel");
    await expect(page.locator("p").first()).toBeVisible();
    await expect(page.getByText(/typescript/i)).toBeVisible();

    // Verify Spotify page content
    await page.goto("/en/experiences/spotify");
    await expect(page.locator("p").first()).toBeVisible();

    // Verify Wunderman Thompson Commerce page content
    await page.goto("/en/experiences/wunderman-thompson-commerce");
    await expect(page.locator("p").first()).toBeVisible();
  });
});

test.describe("Education Detail Pages", () => {
  test("should display headers with type, institution, degree, and dates for all education pages", async ({
    page,
  }) => {
    // Verify University of Bristol page
    await page.goto("/en/education/university-of-bristol");
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /education.*university of bristol/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("time")).toBeVisible();

    // Verify University of Nottingham page
    await page.goto("/en/education/university-of-nottingham");
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /education.*university of nottingham/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("time")).toBeVisible();

    // Verify Altrincham Grammar School page
    await page.goto("/en/education/altrincham-grammar-school-for-boys");
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /education.*altrincham grammar school/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("time")).toBeVisible();
  });

  test("should display content, modules, and project links for all education pages", async ({
    page,
  }) => {
    // Verify Bristol page with grade, modules, and project links
    await page.goto("/en/education/university-of-bristol");
    await expect(page.getByText(/grade.*merit/i)).toBeVisible();
    await expect(page.getByText(/core courses/i)).toBeVisible();
    await expect(page.getByText(/web development/i)).toBeVisible();

    // Verify external project links are visible
    const gameOfLifeLink = page.getByRole("link", { name: /game of life/i });
    await expect(gameOfLifeLink).toBeVisible();
    await expect(gameOfLifeLink).toHaveAttribute("target", "_blank");

    const rayTracerLink = page.getByRole("link", { name: /ray tracer/i });
    await expect(rayTracerLink).toBeVisible();
    await expect(rayTracerLink).toHaveAttribute("target", "_blank");

    // Verify University of Nottingham content
    await page.goto("/en/education/university-of-nottingham");
    await expect(page.locator("p").first()).toBeVisible();

    // Verify Altrincham Grammar School content
    await page.goto("/en/education/altrincham-grammar-school-for-boys");
    await expect(page.locator("p").first()).toBeVisible();
  });
});

test("should load experience and education pages correctly when accessed directly", async ({
  page,
}) => {
  // Navigate directly to Citadel page
  await page.goto("/en/experiences/citadel");
  await expect(
    page.getByRole("heading", { level: 2, name: /citadel/i }),
  ).toBeVisible();

  // Navigate directly to Spotify page
  await page.goto("/en/experiences/spotify");
  await expect(
    page.getByRole("heading", { level: 2, name: /spotify/i }),
  ).toBeVisible();

  // Navigate directly to University of Bristol page
  await page.goto("/en/education/university-of-bristol");
  await expect(
    page.getByRole("heading", { level: 2, name: /bristol/i }),
  ).toBeVisible();

  // Navigate directly to University of Nottingham page
  await page.goto("/en/education/university-of-nottingham");
  await expect(
    page.getByRole("heading", { level: 2, name: /nottingham/i }),
  ).toBeVisible();
});

test("should display English and Chinese content for experience and education pages", async ({
  page,
}) => {
  // Verify English experience page
  await page.goto("/en/experiences/citadel");
  await expect(
    page.getByRole("heading", { level: 2, name: /experience/i }),
  ).toBeVisible();

  // Verify Chinese experience page
  await page.goto("/zh/experiences/citadel");
  await expect(
    page.getByRole("heading", { level: 2, name: /工作/i }),
  ).toBeVisible();

  // Verify English education page
  await page.goto("/en/education/university-of-bristol");
  await expect(
    page.getByRole("heading", { level: 2, name: /education/i }),
  ).toBeVisible();

  // Verify Chinese education page
  await page.goto("/zh/education/university-of-bristol");
  await expect(
    page.getByRole("heading", { level: 2, name: /学习/i }),
  ).toBeVisible();
});

test.describe("Browser Back Navigation", () => {
  test("should navigate back to homepage using browser back button", async ({
    page,
  }) => {
    // Navigate to homepage
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Click Citadel experience card
    await page.getByRole("link", { name: /citadel/i }).click();
    // Wait for heading to appear (navigation may take time)
    await expect(
      page.getByRole("heading", { level: 2, name: /citadel/i }),
    ).toBeVisible({ timeout: 15000 });

    // Go back to homepage
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Verify we see the projects section heading (confirms we're back on homepage)
    await expect(
      page.getByRole("heading", { level: 2, name: /projects/i }),
    ).toBeVisible();
  });
});
