import { expect, test } from "@playwright/test";

/**
 * A route with a Lab renders its doc header from its own `layout.tsx`. Next
 * renders that layout concurrently with the root layout, so the header must
 * resolve the Locale itself: a `/zh` page once shipped an English breadcrumb,
 * title, description and view switch under a Chinese site header.
 */
const labRoutes = ["switch", "button", "toast"];

const cjk = /[㐀-鿿]/;

for (const component of labRoutes) {
  test(`the ${component} doc header is in Chinese on /zh`, async ({ page }) => {
    await page.goto(`/zh/design-system/components/${component}`);

    const breadcrumb = page.getByRole("navigation", { name: "面包屑导航" });
    await expect(
      breadcrumb.getByRole("link", { name: "设计系统" }),
    ).toHaveAttribute("href", "/zh/design-system");

    const viewSwitch = page.getByRole("radiogroup", { name: "视图" });
    await expect(viewSwitch.getByRole("radio", { name: "文档" })).toBeVisible();
    await expect(
      viewSwitch.getByRole("radio", { name: "实验室" }),
    ).toBeVisible();

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(cjk);
    const article = page.getByRole("article");
    await expect(article).not.toContainText("Design system");
    await expect(article.getByRole("radio", { name: "Docs" })).toHaveCount(0);
    await expect(article.getByRole("radio", { name: "Lab" })).toHaveCount(0);
  });

  test(`the ${component} doc header is in English on /`, async ({ page }) => {
    await page.goto(`/design-system/components/${component}`);

    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(
      breadcrumb.getByRole("link", { name: "Design system" }),
    ).toHaveAttribute("href", "/design-system");

    const viewSwitch = page.getByRole("radiogroup", { name: "View" });
    await expect(viewSwitch.getByRole("radio", { name: "Docs" })).toBeVisible();
    await expect(viewSwitch.getByRole("radio", { name: "Lab" })).toBeVisible();

    await expect(page.getByRole("article")).not.toContainText(cjk);
  });
}
