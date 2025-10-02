import { test, expect } from "@playwright/test";

test.describe("Homepage Portfolio", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en");
    // Wait for h1 heading to ensure page has loaded
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("should display headline, biography, and all three content sections", async ({
    page,
  }) => {
    // Verify h1 heading is visible
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Verify biography paragraph is visible
    const paragraphs = page.locator("p");
    await expect(paragraphs.first()).toBeVisible();

    // Verify "Projects" section heading
    await expect(
      page.getByRole("heading", { level: 2, name: /projects/i }),
    ).toBeVisible();

    // Verify "Experiences" section heading
    await expect(
      page.getByRole("heading", { level: 2, name: /experiences/i }),
    ).toBeVisible();

    // Verify "Education" section heading
    await expect(
      page.getByRole("heading", { level: 2, name: /education/i }),
    ).toBeVisible();
  });

  test.describe("Project Section", () => {
    test("should display Movie Database project card with icon, name, and description", async ({
      page,
    }) => {
      // Find the project card link - the card contains movie database name and description
      const projectCard = page.getByRole("link", {
        name: /movie database.*find your next blockbuster/i,
      });
      await expect(projectCard).toBeVisible();

      // Verify project name text is visible within the card
      await expect(projectCard.getByText("Movie Database")).toBeVisible();

      // Verify description text is visible
      await expect(
        projectCard.getByText(/find your next blockbuster/i),
      ).toBeVisible();
    });

    test("should navigate to movie database when project card is clicked", async ({
      page,
    }) => {
      // Click on Movie Database project card
      const projectCard = page.getByRole("link", {
        name: /movie database.*find your next blockbuster/i,
      });
      await projectCard.click();

      // Wait for movie database page to load (long timeout for dev mode on-demand build)
      // Cards are links containing images
      const cards = page
        .getByRole("link")
        .filter({ has: page.getByRole("img") });
      await expect(cards.first()).toBeVisible({ timeout: 30000 });
    });
  });

  test.describe("Experience Section", () => {
    test("should display all three experience cards with logos, dates, and company names", async ({
      page,
    }) => {
      // Verify Citadel card
      const citadelCard = page.getByRole("link", {
        name: /citadel.*august 2021/i,
      });
      await expect(citadelCard).toBeVisible();
      await expect(citadelCard.getByText(/aug 2021/i)).toBeVisible();

      // Verify Spotify card
      const spotifyCard = page.getByRole("link", {
        name: /spotify.*july 2019/i,
      });
      await expect(spotifyCard).toBeVisible();
      await expect(spotifyCard.getByText(/jul 2019.*aug 2021/i)).toBeVisible();

      // Verify Wunderman Thompson Commerce card
      const wtcCard = page.getByRole("link", {
        name: /wunderman thompson commerce.*july 2019/i,
      });
      await expect(wtcCard).toBeVisible();
      await expect(wtcCard.getByText(/sep 2017.*jul 2019/i)).toBeVisible();
    });

    test("should navigate to experience detail pages when cards are clicked", async ({
      page,
    }) => {
      // Click Citadel experience card
      await page.getByRole("link", { name: /citadel/i }).click();
      // Verify detail page content (h2 with company name)
      await expect(
        page.getByRole("heading", { level: 2, name: /citadel/i }),
      ).toBeVisible({ timeout: 15000 });

      // Go back to homepage
      await page.goto("/en");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      // Click Spotify card
      await page.getByRole("link", { name: /spotify/i }).click();
      await expect(
        page.getByRole("heading", { level: 2, name: /spotify/i }),
      ).toBeVisible({ timeout: 15000 });

      // Go back to homepage
      await page.goto("/en");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      // Click Wunderman Thompson Commerce card
      await page
        .getByRole("link", { name: /wunderman thompson commerce/i })
        .click();
      await expect(
        page.getByRole("heading", {
          level: 2,
          name: /wunderman thompson commerce/i,
        }),
      ).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe("Education Section", () => {
    test("should display all three education cards with logos, degree names, and dates", async ({
      page,
    }) => {
      // Verify University of Bristol card
      const bristolCard = page.getByRole("link", {
        name: /university of bristol/i,
      });
      await expect(bristolCard).toBeVisible();
      await expect(bristolCard.getByText(/sep 2016.*jan 2018/i)).toBeVisible();

      // Verify University of Nottingham card
      const nottinghamCard = page.getByRole("link", {
        name: /university of nottingham/i,
      });
      await expect(nottinghamCard).toBeVisible();
      await expect(
        nottinghamCard.getByText(/sep 2013.*jul 2016/i),
      ).toBeVisible();

      // Verify Altrincham Grammar School card
      const agsbCard = page.getByRole("link", {
        name: /altrincham grammar school/i,
      });
      await expect(agsbCard).toBeVisible();
      await expect(agsbCard.getByText(/sep 2011.*jul 2013/i)).toBeVisible();
    });

    test("should navigate to education detail pages when cards are clicked", async ({
      page,
    }) => {
      // Click University of Bristol card
      await page.getByRole("link", { name: /university of bristol/i }).click();
      await expect(
        page.getByRole("heading", { level: 2, name: /bristol/i }),
      ).toBeVisible({ timeout: 15000 });

      // Go back to homepage
      await page.goto("/en");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      // Click University of Nottingham card
      await page
        .getByRole("link", { name: /university of nottingham/i })
        .click();
      await expect(
        page.getByRole("heading", { level: 2, name: /nottingham/i }),
      ).toBeVisible({ timeout: 15000 });

      // Go back to homepage
      await page.goto("/en");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      // Click Altrincham Grammar School card
      await page
        .getByRole("link", { name: /altrincham grammar school/i })
        .click();
      await expect(
        page.getByRole("heading", { level: 2, name: /altrincham/i }),
      ).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe("Bilingual Support", () => {
    test("should display English and Chinese content correctly", async ({
      page,
    }) => {
      // Verify English content
      await page.goto("/en");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(
        page.getByText(/hi.*i'm qingqi.*i'm a software engineer/is),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 2, name: "Projects" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          level: 2,
          name: "Professional Experiences",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 2, name: "Education" }),
      ).toBeVisible();
      await expect(page.getByText(/find your next blockbuster/i)).toBeVisible();

      // Verify Chinese content
      await page.goto("/zh");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText(/嗨，我叫石清琪/)).toBeVisible();
      await expect(page.getByText(/我是一名软件工程师/)).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 2, name: "项目" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 2, name: "职业经历" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 2, name: "教育" }),
      ).toBeVisible();
      await expect(page.getByText(/你的下一个大片/)).toBeVisible();
    });

    test("should maintain language when navigating from cards", async ({
      page,
    }) => {
      // Start on Chinese homepage
      await page.goto("/zh");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      // Click Citadel experience card
      await page.getByRole("link", { name: /citadel/i }).click();

      // Verify detail page is in Chinese (工作 = work/experience)
      await expect(
        page.getByRole("heading", { level: 2, name: /工作.*citadel/i }),
      ).toBeVisible({ timeout: 15000 });
    });
  });
});
