import { expect, test, type Locator } from "@playwright/test";

const LAB_URL = "/design-system/components/button/lab";

declare global {
  interface Window {
    /** Every animation the snippet starts, as `text:id:first opacity`. */
    labAnimations?: string[];
  }
}

/**
 * Click, then wait for what the click does. Until the Lab has hydrated the
 * click lands on inert markup and nothing happens, so poll the pair. Every
 * control here is idempotent, so a repeated click is safe.
 */
async function clickUntil(target: Locator, settled: () => Promise<unknown>) {
  await expect(async () => {
    await target.click();
    await settled();
  }).toPass({ timeout: 15_000 });
}

test.describe("Button Lab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LAB_URL);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("switches between the two views", async ({ page }) => {
    await expect(page.getByRole("radio", { name: "Lab" })).toBeChecked();

    await clickUntil(page.getByRole("radio", { name: "Docs" }), () =>
      expect(page).toHaveURL(/\/design-system\/components\/button$/, {
        timeout: 2000,
      }),
    );

    // The switch's indicator slides only if the control survives the switch
    // as the same element; a remount lands it in place with nothing to
    // animate from.
    const control = await page
      .getByRole("radiogroup", { name: "View" })
      .elementHandle();
    await clickUntil(page.getByRole("radio", { name: "Lab" }), () =>
      expect(page).toHaveURL(/\/design-system\/components\/button\/lab$/, {
        timeout: 2000,
      }),
    );
    expect(await control.evaluate((element) => element.isConnected)).toBe(true);
  });

  test("a Variant sets the Specimen and the snippet together", async ({
    page,
  }) => {
    const snippet = page.getByRole("code");
    await expect(snippet).toContainText('look="primary"');

    await clickUntil(page.getByRole("radio", { name: "Outline" }), () =>
      expect(snippet).toContainText('look="outline"', { timeout: 2000 }),
    );
    await expect(snippet).not.toContainText('look="primary"');
    await expect(
      page.getByRole("button", { name: "Save changes" }),
    ).toBeVisible();
  });

  test("a control tunes the Variant it is on", async ({ page }) => {
    const snippet = page.getByRole("code");
    await expect(snippet).not.toContainText("size=");

    await clickUntil(page.getByRole("radio", { name: "lg", exact: true }), () =>
      expect(snippet).toContainText('size="lg"', { timeout: 2000 }),
    );
    await clickUntil(page.getByRole("radio", { name: "md", exact: true }), () =>
      expect(snippet).not.toContainText("size=", { timeout: 2000 }),
    );
  });

  test("an attribute rises in when it arrives and fades when it leaves", async ({
    page,
  }) => {
    const snippet = page.getByRole("code");
    await clickUntil(page.getByRole("radio", { name: "lg", exact: true }), () =>
      expect(snippet).toContainText('size="lg"', { timeout: 2000 }),
    );
    await clickUntil(page.getByRole("radio", { name: "md", exact: true }), () =>
      expect(snippet).not.toContainText("size=", { timeout: 2000 }),
    );

    // CodeBlock animates its boxes with the Web Animations API, and a part
    // that leaves is drawn outside React's tree as a ghost, so the record of
    // each animation started under the code is the evidence.
    await snippet.evaluate((code) => {
      const seen: string[] = [];
      // eslint-disable-next-line @typescript-eslint/unbound-method -- called with the element as `this` below
      const { animate } = Element.prototype;
      Element.prototype.animate = function (this: Element, keyframes, options) {
        if (
          code.contains(this) &&
          Array.isArray(keyframes) &&
          typeof options === "object"
        ) {
          const [first] = keyframes;
          seen.push(
            `${this.textContent}:${options.id ?? ""}:${String(first.opacity ?? "")}`,
          );
        }
        return animate.call(this, keyframes, options);
      };
      window.labAnimations = seen;
    });
    const animations = () => page.evaluate(() => window.labAnimations);

    await page.getByRole("radio", { name: "lg", exact: true }).click();
    await expect.poll(animations).toContainEqual("size=:code-block-fade:0");
    await page.getByRole("radio", { name: "md", exact: true }).click();
    // The attribute and its value are two parts, so the whole `size="lg"`
    // leaves as two ghosts, each fading on its own.
    await expect.poll(animations).toContainEqual("size=:code-block-fade:1");
    await expect.poll(animations).toContainEqual('"lg":code-block-fade:1');
  });

  test("reset returns to the Variant's props", async ({ page }) => {
    const snippet = page.getByRole("code");
    await clickUntil(page.getByRole("radio", { name: "lg", exact: true }), () =>
      expect(snippet).toContainText('size="lg"', { timeout: 2000 }),
    );

    await clickUntil(page.getByRole("button", { name: "Reset" }), () =>
      expect(snippet).not.toContainText("size=", { timeout: 2000 }),
    );
  });

  test("copies the snippet", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await clickUntil(
      page.getByRole("button", { name: "Copy code" }),
      async () => {
        const copied = await page.evaluate(() =>
          navigator.clipboard.readText(),
        );
        expect(copied).toContain(
          'import { Button } from "@tuja/ui/components/button";',
        );
        expect(copied).toContain('look="primary"');
      },
    );
  });

  test("fits a phone without scrolling sideways", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("code")).toBeVisible();
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflows).toBe(false);
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test.beforeEach(async ({ page }) => {
      // A reused dev server parks its overlay button over the foot of a
      // phone-width viewport, which is where the bar puts its close control.
      // The production build CI runs ships no overlay.
      await page.addStyleTag({ content: "nextjs-portal { display: none }" });
    });

    test("shows the Specimen and the snippet on one screen", async ({
      page,
    }) => {
      await expect(page.getByRole("code")).toBeInViewport({ ratio: 1 });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollHeight > window.innerHeight,
          ),
        )
        .toBe(false);
    });

    test("tunes a prop from the bar", async ({ page }) => {
      const snippet = page.getByRole("code");
      const controls = page.getByRole("button", { name: "Controls" });
      const closeControl = page.getByRole("button", { name: "Close control" });
      await expect(controls).toBeVisible();

      await clickUntil(controls, () =>
        expect(controls).toHaveAttribute("aria-expanded", "true", {
          timeout: 2000,
        }),
      );

      await page.getByRole("button", { name: "size md" }).click();

      // The row hands the bar to the control it names, so the way into the
      // Sheet goes with it.
      await expect(controls).toHaveCount(0);
      await expect(closeControl).toBeVisible();

      await page.getByRole("radio", { name: "lg", exact: true }).click();
      await expect(snippet).toContainText('size="lg"');

      await closeControl.click();
      await expect(controls).toBeFocused();

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflows).toBe(false);
    });
  });
});
