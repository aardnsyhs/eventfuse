import { test, expect } from "@playwright/test";

const faultsByPage = new WeakMap();
test.beforeEach(async ({ page }) => {
  const faults = [];
  faultsByPage.set(page, faults);
  page.on("console", (message) => {
    if (message.type() === "error") faults.push(message.text());
  });
  page.on("pageerror", (error) => faults.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(faultsByPage.get(page)).toEqual([]);
});

const screens = {
  landing: "Know what breaks before it happens.",
  workspace: "Fictional corporate product launch",
  blueprint: "The production blueprint",
  scenario: "Trace the disruption.",
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
          path: `/tmp/eventfuse-phase3b-${route}-${width}.png`,
          fullPage: true,
        });
    });
  }
}

test("navigation, no initial preference, explicit selection and conditional brief", async ({
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
      name: "Select a proposal to prepare its brief",
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Mark as preferred proposal" })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "✓ Preferred proposal · not authorized" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "✓ Preferred proposal · not authorized" })
    .click();
  await expect(
    page.getByRole("button", { name: "✓ Preferred proposal · not authorized" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "View A timings & assumptions" })
    .click();
  await expect(page.locator("#option-detail-a")).toBeVisible();
  await page.getByRole("link", { name: "Prepare decision brief" }).click();
  await page.getByRole("button", { name: "Prepare brief snapshot" }).click();
  await expect(page.getByRole("article")).toContainText(
    "Additional cost: Not entered",
  );
  await expect(
    page.getByText(
      "Selection does not authorize work; pending approvals remain outstanding.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy brief", exact: true }),
  ).toBeEnabled();
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
    page.getByRole("list", { name: "Dependency list" }).getByRole("listitem"),
  ).toHaveCount(6);
  await expect(
    page.getByRole("list", { name: "Dependency list" }),
  ).toContainText("Lighting → System Testing · lag 0 min");
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
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
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

test("dynamic timeline preserves timing geometry, parallel rows and milestone boundaries", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [route, timings, horizon] of [
    [
      "blueprint",
      [
        [0, 120],
        [120, 240],
        [120, 240],
        [300, 360],
        [360, 480],
        [540, 540],
      ],
      660,
    ],
    [
      "scenario",
      [
        [240, 360],
        [360, 480],
        [360, 480],
        [480, 540],
        [540, 660],
        [660, 660],
      ],
      660,
    ],
  ]) {
    await page.goto(`/#${route}`);
    const tracks = page.locator("[data-timeline-track]");
    await expect(tracks).toHaveCount(6);
    await expect(page.locator('main img[src*="schedules"]')).toHaveCount(0);
    for (let i = 0; i < 5; i++) {
      const values = await tracks
        .nth(i)
        .locator("[data-scenario-bar]")
        .evaluate((el) => ({
          left: parseFloat(el.style.left),
          width: parseFloat(el.style.width),
        }));
      expect(values.left).toBeCloseTo((timings[i][0] / horizon) * 100, 3);
      expect(values.width).toBeCloseTo(
        ((timings[i][1] - timings[i][0]) / horizon) * 100,
        3,
      );
    }
    await expect(tracks.nth(5).locator("[data-milestone-marker]")).toHaveCSS(
      "left",
      /.+px/,
    );
    expect(
      parseFloat(
        await tracks
          .nth(5)
          .locator("[data-milestone-marker]")
          .evaluate((el) => el.style.left),
      ),
    ).toBeCloseTo((timings[5][1] / horizon) * 100, 3);
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
