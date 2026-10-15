import { test, expect } from "@playwright/test";

const screens = {
  landing: "Know what breaks before it happens.",
  workspace: "Corporate Product Launch",
  blueprint: "The production blueprint",
  scenario: "Four hours late. Two hours over.",
  compare: "Compare responses. Keep the conditions.",
  brief: "A proposal for the production meeting.",
};
for (const width of [320, 375, 390, 768, 1024, 1440]) {
  for (const [route, heading] of Object.entries(screens)) {
    test(`${route} at ${width}px renders without page overflow or runtime errors`, async ({
      page,
    }) => {
      const faults = [];
      page.on("pageerror", (error) => faults.push(error.message));
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/#${route}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
      expect(faults).toEqual([]);
      if (route !== "landing")
        await expect(
          page.getByText("15 OCT 2026 · ASIA/JAKARTA · ALL TIMES LOCAL"),
        ).toBeVisible();
      if ([390, 1440].includes(width))
        await page.screenshot({
          path: `/tmp/eventfuse-phase3a-${route}-${width}.png`,
          fullPage: true,
        });
    });
  }
}

test("navigation, no initial preference, explicit preview selection and conditional brief", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Open the fictional demo", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    screens.workspace,
  );
  await page
    .getByRole("navigation", { name: "Production workflow" })
    .getByRole("link")
    .nth(2)
    .click();
  await expect(
    page.getByText("No proposal preferred. Nothing is selected automatically."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Select a proposal to view its example brief",
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Mark as preferred proposal" })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "✓ Preferred proposal · not approved" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole('button', { name: '✓ Preferred proposal · not approved' }).click();
  await expect(page.getByRole('button', { name: '✓ Preferred proposal · not approved' })).toHaveAttribute('aria-pressed', 'true');
  await page
    .getByRole("button", { name: "View A timings & assumptions" })
    .click();
  await expect(page.locator("#option-detail-a")).toBeVisible();
  await page
    .getByRole("link", { name: "View example brief with proposal A" })
    .click();
  await expect(page.getByRole("article")).toContainText(
    "Additional cost: Not entered.",
  );
  await expect(
    page.getByText(
      "Selection does not authorize work; pending approvals remain outstanding.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy brief", exact: true }),
  ).toBeDisabled();
});

test("dialog keyboard focus, Escape and focus return", async ({ page }) => {
  await page.goto("/#blueprint");
  const trigger = page.getByRole("button", {
    name: "+ Create activity",
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  for (let i = 0; i < 9; i++) await page.keyboard.press("Tab");
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("graph renders six nodes, six edges and an accessible text equivalent", async ({
  page,
}) => {
  await page.goto("/#blueprint");
  await expect(page.locator(".react-flow__node")).toHaveCount(6);
  await expect(page.locator(".react-flow__edge")).toHaveCount(6);
  await expect(
    page.getByText(
      "Power → Audio AND Lighting → System Testing → Full Rehearsal → Doors Open.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("reduced motion and 200% text retain mobile access", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/#compare");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await page
    .getByRole("button", { name: "View B timings & assumptions" })
    .click();
  await expect(page.locator("#option-detail-b")).toBeVisible();
});

test("keyboard skip link reaches main content", async ({ page }) => {
  await page.goto("/#scenario");
  await page.keyboard.press("Tab");
  // Start from a deterministic focus position rather than relying on browser autofocus order.
  await page.getByRole("link", { name: "Skip to content" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    screens.scenario,
  );
});

test("Figma timeline assets load in their correct rows at native geometry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [route, filenames, height] of [
    [
      "blueprint",
      [
        "70599.svg",
        "018da.svg",
        "018da.svg",
        "6bfd4.svg",
        "a0186.svg",
        "b29e0.svg",
      ],
      30,
    ],
    [
      "scenario",
      [
        "7dd30.svg",
        "c9e9e.svg",
        "c9e9e.svg",
        "d47a3.svg",
        "edb61.svg",
        "aaf96.svg",
      ],
      42,
    ],
  ]) {
    await page.goto(`/#${route}`);
    const images = page.locator(".timeline-track img");
    await expect(images).toHaveCount(6);
    for (let i = 0; i < 6; i++) {
      const image = images.nth(i);
      await expect(image).toHaveAttribute(
        "src",
        `/design/schedules/${filenames[i]}`,
      );
      await expect
        .poll(() => image.evaluate((el) => el.complete && el.naturalWidth > 0))
        .toBe(true);
      expect(
        await image.evaluate((el) => ({
          w: el.getBoundingClientRect().width,
          h: el.getBoundingClientRect().height,
        })),
      ).toEqual({ w: 652, h: height });
    }
  }
});

test("touch viewport can navigate and inspect recovery details", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/#workspace");
  await page
    .getByRole("navigation", { name: "Production workflow" })
    .getByRole("link", { name: "Compare", exact: true })
    .tap();
  await page
    .getByRole("button", { name: "View B timings & assumptions" })
    .tap();
  await expect(page.locator("#option-detail-b")).toBeVisible();
  await context.close();
});
