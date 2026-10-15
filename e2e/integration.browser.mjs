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

const demoKey = "eventfuse:v1:demo:launch";
const go = async (page, screen) => {
  await page
    .getByRole("navigation", { name: "Production workflow" })
    .getByRole("link")
    .nth(["blueprint", "scenario", "compare", "brief"].indexOf(screen))
    .click();
};
const accept = (page) => page.once("dialog", (dialog) => dialog.accept());
const start = async (page, route = "workspace") => {
  await page.goto(`/#${route}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
};
const preferA = async (page) => {
  await page
    .getByRole("button", { name: "Mark as preferred proposal" })
    .first()
    .click();
};
const prepare = async (page) => {
  await go(page, "brief");
  await page.getByRole("button", { name: "Prepare brief snapshot" }).click();
  await expect(page.getByRole("article")).toBeVisible();
};
const save = async (page) => {
  await page
    .getByRole("button", { name: "Save workspace", exact: true })
    .click();
  await expect(
    page.getByText("Workspace saved in this browser.", { exact: true }),
  ).toBeVisible();
};

test("real workflow: apply, compare, select, brief, copy, print, reload, revise and reset", async ({
  page,
  context,
}, testInfo) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await start(page, "landing");
  await page
    .getByRole("link", { name: "Open the fictional demo", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Fictional corporate product launch",
  );
  await go(page, "blueprint");
  accept(page);
  await page
    .getByRole("button", { name: "Apply baseline", exact: true })
    .click();
  await expect(page.getByText("Validation: valid")).toBeVisible();
  await go(page, "scenario");
  await page
    .getByLabel("Incident activity", { exact: true })
    .selectOption("power");
  await page
    .getByLabel("Delay from calculated baseline start (minutes)", {
      exact: true,
    })
    .fill("240");
  const started = performance.now();
  await page.getByRole("button", { name: "Apply delay", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Current incident impact" }),
  ).toContainText("19:00");
  const interactionMs = performance.now() - started;
  await testInfo.attach("apply-delay-observed-wall-time", {
    body: JSON.stringify({
      interactionMs,
      includes:
        "Playwright action, real controller and engine, React commit, assertion round trips; one Chromium observation, not a percentile guarantee",
    }),
    contentType: "application/json",
  });
  const impact = page.getByRole("region", { name: "Current incident impact" });
  await expect(impact).toContainText("Baseline 17:00");
  await expect(impact).toContainText("Deadline breach +120 min");
  await expect(impact).toContainText("6 of 6 activities shift");
  await page.getByRole("button", { name: "Explain shifted times" }).click();
  await expect(page.locator("#causal-detail")).toContainText("Power → Audio");
  await go(page, "compare");
  await page
    .getByRole("button", { name: "Add canonical demo alternatives" })
    .click();
  const a = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", {
        name: "Earlier vendor arrival",
        exact: true,
      }),
    })
    .last();
  const b = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", {
        name: "Parallel setup compression",
        exact: true,
      }),
    })
    .last();
  await expect(a).toContainText("17:00");
  await expect(a).toContainText("Recovered vs incident 120 min");
  await expect(b).toContainText("18:00");
  await expect(b).toContainText("Recovered vs incident 60 min");
  await expect(a).toContainText("Not entered");
  await expect(b).toContainText("approval pending");
  await expect(
    page.getByText("No proposal preferred. Nothing is selected automatically."),
  ).toBeVisible();
  await preferA(page);
  await prepare(page);
  await expect(page.getByRole("article")).toContainText(
    "Approval status: pending",
  );
  await expect(page.getByRole("article")).toContainText("COST_NOT_ENTERED");
  await page.getByRole("button", { name: "Copy brief", exact: true }).click();
  await expect(
    page.getByText(
      "Brief copied, including assumptions and approval warnings.",
    ),
  ).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("Not entered");
  expect(copied).toContain("pending");
  expect(copied).toContain("Selection does not authorize work");
  expect(copied).toMatch(/next actions/i);
  await page.evaluate(() => {
    const print = window.print.bind(window);
    window.print = () => {
      window.__printCalls = (window.__printCalls ?? 0) + 1;
      print();
    };
  });
  await page.getByRole("button", { name: "Print / save PDF" }).click();
  expect(await page.evaluate(() => window.__printCalls)).toBe(1);
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("article")).toBeVisible();
  await expect(page.locator("header")).not.toBeVisible();
  await expect(page.getByRole("article")).toContainText("COST_NOT_ENTERED");
  const pdf = await page.pdf({
    path: "/tmp/eventfuse-phase3b-decision-brief.pdf",
    format: "A4",
    printBackground: true,
  });
  expect(pdf.length).toBeGreaterThan(5000);
  await page.emulateMedia({ media: "screen" });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: "/tmp/eventfuse-phase3b-prepared-brief-390-text200.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "100%";
  });
  await save(page);
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    demoKey,
  );
  const frozenBrief = saved.decisionBriefs[0],
    originalBaseline = saved.baselineVersions[frozenBrief.baselineVersion];
  await page.reload();
  await expect(page.getByRole("article")).toContainText(frozenBrief.id);
  await go(page, "compare");
  await expect(
    page.getByRole("button", { name: "✓ Preferred proposal · not authorized" }),
  ).toHaveAttribute("aria-pressed", "true");
  await go(page, "blueprint");
  await page
    .getByRole("button", { name: "Edit Rehearsal", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Duration (minutes)", { exact: true })
    .fill("180");
  await page.getByRole("button", { name: "Save activity draft" }).click();
  await expect(page.getByText("Unapplied baseline draft")).toBeVisible();
  accept(page);
  await page
    .getByRole("button", { name: "Apply baseline", exact: true })
    .click();
  await go(page, "scenario");
  await page
    .getByLabel("Delay from calculated baseline start (minutes)", {
      exact: true,
    })
    .fill("240");
  await page.getByRole("button", { name: "Apply delay", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Current incident impact" }),
  ).toContainText("20:00");
  await go(page, "brief");
  await expect(page.getByRole("article")).toContainText("Historical snapshot");
  await expect(page.getByRole("article")).toContainText("19:00");
  await expect(
    page.getByRole("button", { name: "Prepare brief snapshot" }),
  ).toBeDisabled();
  await save(page);
  const revised = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    demoKey,
  );
  expect(revised.decisionBriefs[0]).toEqual(frozenBrief);
  expect(revised.baselineVersions[frozenBrief.baselineVersion]).toEqual(
    originalBaseline,
  );
  await go(page, "scenario");
  accept(page);
  await page
    .getByRole("button", { name: "Reset incident", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Current incident impact" }),
  ).toContainText("17:00");
  await go(page, "compare");
  await expect(page.getByText("0 of 3 slots used")).toBeVisible();
  await expect(
    page.getByText("No proposal preferred. Nothing is selected automatically."),
  ).toBeVisible();
});

test("raw numeric and cost errors retain input, clear stale metrics, and preserve unknown versus zero", async ({
  page,
}) => {
  await start(page, "scenario");
  const delay = page.getByLabel(
    "Delay from calculated baseline start (minutes)",
    { exact: true },
  );
  await delay.fill("1e2");
  await page.getByRole("button", { name: "Apply delay" }).click();
  await expect(delay).toHaveValue("1e2");
  await expect(page.getByRole("alert")).toContainText("whole number");
  await expect(
    page.getByRole("region", { name: "Current incident impact" }),
  ).not.toContainText("19:00");
  await delay.fill("240");
  await page.getByRole("button", { name: "Apply delay" }).click();
  await go(page, "compare");
  await page
    .getByRole("button", { name: "Add canonical demo alternatives" })
    .click();
  await preferA(page);
  await page
    .getByRole("button", { name: "Edit option", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Cost estimate state").selectOption("entered");
  await dialog.getByLabel("Additional cost (USD)", { exact: true }).fill("1e2");
  await dialog.getByRole("button", { name: "Save option draft" }).click();
  await expect(
    dialog.getByLabel("Additional cost (USD)", { exact: true }),
  ).toHaveValue("1e2");
  await expect(dialog.getByRole("alert")).toBeVisible();
  await dialog.getByLabel("Additional cost (USD)", { exact: true }).fill("0");
  await dialog.getByRole("button", { name: "Save option draft" }).click();
  await expect(
    page.getByText("No proposal preferred. Nothing is selected automatically."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mark as preferred proposal" }).first(),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Apply option A" }).click();
  await page.getByRole("button", { name: "Compare applied options" }).click();
  await expect(
    page.getByText("Additional cost: $0.00", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Additional cost: Not entered · unknown is not USD 0", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit option", exact: true })
    .first()
    .click();
  await dialog.getByLabel("Approval status").selectOption("confirmed");
  await dialog.getByRole("button", { name: "Save option draft" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "externally verified context",
  );
  await dialog
    .getByLabel("External approval context", { exact: true })
    .fill(
      "Fictional vendor confirmation, recorded by production lead at 09:00.",
    );
  await dialog.getByRole("button", { name: "Save option draft" }).click();
  await page.getByRole("button", { name: "Apply option A" }).click();
  await page.getByRole("button", { name: "Compare applied options" }).click();
  await expect(
    page.getByText("Hypothetical · approval confirmed", { exact: true }),
  ).toBeVisible();
  await preferA(page);
  await expect(
    page.getByRole("button", {
      name: "✓ Preferred proposal · not authorized",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText("Hypothetical · approval confirmed", { exact: true }),
  ).toBeVisible();
});

test("invalid graph and milestone deletion are explicit and never replace the saved baseline", async ({
  page,
}) => {
  await start(page, "blueprint");
  const before = await page.evaluate(
    (key) => localStorage.getItem(key),
    demoKey,
  );
  await page
    .getByRole("button", { name: "+ Create dependency", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Predecessor", { exact: true })
    .selectOption("doors");
  await page
    .getByRole("dialog")
    .getByLabel("Successor", { exact: true })
    .selectOption("power");
  await page.getByRole("button", { name: "Save dependency draft" }).click();
  await page
    .getByRole("button", { name: "Validate baseline", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(/cycle/i);
  await page
    .getByRole("button", { name: "Save workspace", exact: true })
    .click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), demoKey)).toBe(
    before,
  );
  const edge = page
    .getByRole("listitem")
    .filter({ hasText: "Doors Open → Power · lag 0 min" })
    .filter({
      has: page.getByRole("button", { name: "Delete dependency", exact: true }),
    });
  accept(page);
  await edge
    .getByRole("button", { name: "Delete dependency", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Validate baseline", exact: true })
    .click();
  await expect(page.getByText("Validation: valid")).toBeVisible();
  accept(page);
  await page
    .getByRole("button", { name: "Delete Doors Open", exact: true })
    .click();
  await expect(page.locator(".react-flow__node")).toHaveCount(5);
  await expect(page.locator(".react-flow__edge")).toHaveCount(5);
  await expect(
    page.getByText("No critical deadlines.", { exact: false }),
  ).toBeVisible();
  accept(page);
  await page
    .getByRole("button", { name: "Apply baseline", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(/milestone/i);
  expect(await page.evaluate((key) => localStorage.getItem(key), demoKey)).toBe(
    before,
  );
});

test("protected duration rejection and signed negative recovery are real engine results", async ({
  page,
}) => {
  await start(page, "compare");
  await page
    .getByRole("button", { name: "+ Add alternative", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Option name", { exact: true })
    .fill("Protected duration attempt");
  await dialog.getByRole("button", { name: "+ Add change" }).click();
  await dialog
    .getByLabel("Change 1 activity", { exact: true })
    .selectOption("testing");
  await dialog
    .getByLabel("Change 1 field", { exact: true })
    .selectOption("duration");
  await dialog
    .getByLabel("Change 1 value (elapsed minutes)", { exact: true })
    .fill("30");
  await dialog.getByRole("button", { name: "Save option draft" }).click();
  await page.getByRole("button", { name: "Apply option C" }).click();
  await expect(page.getByRole("alert")).toContainText(/protected/i);
  await expect(
    page.getByRole("button", { name: "Mark as preferred proposal" }).last(),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Edit option", exact: true })
    .last()
    .click();
  await dialog
    .getByLabel("Option name", { exact: true })
    .fill("A later Power start");
  await dialog
    .getByLabel("Change 1 activity", { exact: true })
    .selectOption("power");
  await dialog
    .getByLabel("Change 1 field", { exact: true })
    .selectOption("earliest_start");
  await dialog
    .getByLabel("Change 1 value (elapsed minutes)", { exact: true })
    .fill("300");
  await dialog.getByRole("button", { name: "Save option draft" }).click();
  await page.getByRole("button", { name: "Apply option C" }).click();
  await page.getByRole("button", { name: "Compare applied options" }).click();
  await expect(
    page.getByText(
      "Delay vs baseline +180 min · Recovered vs incident -60 min",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText("3 of 3 slots used")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "+ Add alternative", exact: true }),
  ).toBeDisabled();
  accept(page);
  await page
    .getByRole("button", { name: "Delete option", exact: true })
    .last()
    .click();
  await expect(page.getByText("2 of 3 slots used")).toBeVisible();
});

test("multiple events, an empty draft, and demo reset preserve separate namespaces", async ({
  page,
}) => {
  await start(page);
  await page
    .getByRole("button", { name: "+ Create local event", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Event name", { exact: true })
    .fill("Local show with no milestones");
  await dialog.getByRole("button", { name: "Create event draft" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Local show with no milestones",
  );
  await save(page);
  const userKey = await page.evaluate(() =>
    Object.keys(localStorage).find((key) =>
      key.startsWith("eventfuse:v1:workspace:"),
    ),
  );
  const userRecord = await page.evaluate(
    (key) => localStorage.getItem(key),
    userKey,
  );
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Local show with no milestones",
  );
  await page
    .getByRole("button", { name: "Open fictional demo", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Fictional corporate product launch",
  );
  accept(page);
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await save(page);
  expect(await page.evaluate((key) => localStorage.getItem(key), userKey)).toBe(
    userRecord,
  );
  await page
    .getByLabel("Saved local events", { exact: true })
    .selectOption({ label: "Local show with no milestones" });
  await page
    .getByRole("button", { name: "Open saved event", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Local show with no milestones",
  );
  await page.getByRole("button", { name: "Edit event", exact: true }).click();
  await dialog
    .getByLabel("Event name", { exact: true })
    .fill("Renamed local show");
  await dialog.getByRole("button", { name: "Save event draft" }).click();
  await save(page);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Renamed local show",
  );
});

test("cross-tab writes conflict, preserve the newer record, and recover only after reload confirmation", async ({
  context,
}) => {
  const first = await context.newPage(),
    second = await context.newPage();
  await start(first, "compare");
  await start(second, "compare");
  await preferA(first);
  await preferA(second);
  await save(first);
  const newer = await first.evaluate(
    (key) => localStorage.getItem(key),
    demoKey,
  );
  await second
    .getByRole("button", { name: "Save workspace", exact: true })
    .click();
  await expect(
    second.getByRole("alert").filter({ hasText: "STORAGE_CONFLICT" }),
  ).toBeVisible();
  expect(
    await second.evaluate((key) => localStorage.getItem(key), demoKey),
  ).toBe(newer);
  second.once("dialog", (dialog) => dialog.dismiss());
  await second.getByRole("button", { name: "Reload saved workspace" }).click();
  await expect(
    second.getByRole("alert").filter({ hasText: "STORAGE_CONFLICT" }),
  ).toBeVisible();
  accept(second);
  await second.getByRole("button", { name: "Reload saved workspace" }).click();
  await expect(
    second.getByText("Saved workspace restored.", { exact: true }),
  ).toBeVisible();
  await expect(
    second.getByRole("button", {
      name: "✓ Preferred proposal · not authorized",
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await first.close();
  await second.close();
});

for (const [label, raw, expected] of [
  ["corrupt JSON", "{broken", "STORAGE_CORRUPT"],
  ["unsupported schema", '{"schemaVersion":2}', "UNSUPPORTED_SCHEMA"],
]) {
  test(`${label} hydration preserves the original and allows a separate local event`, async ({
    page,
  }) => {
    await page.addInitScript(
      ({ key, raw }) => {
        localStorage.setItem(key, raw);
      },
      { key: demoKey, raw },
    );
    await page.goto("/#workspace");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Stored workspace needs attention",
    );
    await expect(page.getByRole("alert")).toContainText(expected);
    expect(
      await page.evaluate((key) => localStorage.getItem(key), demoKey),
    ).toBe(raw);
    await page.getByRole("button", { name: "+ Create local event" }).click();
    await page
      .getByRole("dialog")
      .getByLabel("Event name", { exact: true })
      .fill("Separate recovery event");
    await page.getByRole("button", { name: "Create event draft" }).click();
    await save(page);
    expect(
      await page.evaluate((key) => localStorage.getItem(key), demoKey),
    ).toBe(raw);
  });
}

for (const kind of ["quota", "unavailable", "no-locks"]) {
  test(`${kind} exposes a real persistence failure and never claims success`, async ({
    page,
  }) => {
    await page.addInitScript((kind) => {
      if (kind === "no-locks")
        Object.defineProperty(navigator, "locks", {
          configurable: true,
          value: undefined,
        });
      else if (kind === "unavailable")
        Object.defineProperty(window, "localStorage", {
          configurable: true,
          get() {
            throw new DOMException("Disabled storage", "SecurityError");
          },
        });
      else
        Storage.prototype.setItem = function () {
          throw new DOMException("Full storage", "QuotaExceededError");
        };
    }, kind);
    await start(page, "compare");
    await expect(
      page.getByText(
        "No proposal preferred. Nothing is selected automatically.",
      ),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Save workspace", exact: true })
      .click();
    await expect(
      page
        .getByRole("alert")
        .filter({
          hasText:
            kind === "quota"
              ? "STORAGE_QUOTA"
              : kind === "no-locks"
                ? "LOCK_UNAVAILABLE"
                : "STORAGE_UNAVAILABLE",
        })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByText("Workspace saved in this browser.", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Unsaved in this tab", { exact: true }),
    ).toBeVisible();
  });
}

test("clipboard denial has an honest recovery message", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      value: async () => {
        throw new DOMException("Denied", "NotAllowedError");
      },
    });
  });
  await start(page, "compare");
  await preferA(page);
  await prepare(page);
  await page.getByRole("button", { name: "Copy brief", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Clipboard access failed",
  );
  await expect(
    page.getByText(
      "Brief copied, including assumptions and approval warnings.",
    ),
  ).toHaveCount(0);
});

test("event-local DST gaps and folds are handled through the actual event form", async ({
  page,
}) => {
  await start(page);
  await page
    .getByRole("button", { name: "+ Create local event", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Event name", { exact: true }).fill("DST rehearsal");
  await dialog.getByLabel("Event date", { exact: true }).fill("2026-03-08");
  await dialog
    .getByLabel("IANA timezone", { exact: true })
    .fill("America/New_York");
  await dialog
    .getByLabel("Production reference (event local)", { exact: true })
    .fill("2026-03-08T02:30");
  await dialog.getByRole("button", { name: "Create event draft" }).click();
  await expect(dialog.getByRole("alert")).toContainText("does not exist");
  await dialog.getByLabel("Event date", { exact: true }).fill("2026-11-01");
  await dialog
    .getByLabel("Production reference (event local)", { exact: true })
    .fill("2026-11-01T01:30");
  await dialog.getByRole("button", { name: "Create event draft" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "occurs more than once",
  );
  await dialog
    .getByLabel("Repeated time: UTC instant", { exact: true })
    .selectOption("2026-11-01T06:30:00Z");
  await dialog.getByRole("button", { name: "Create event draft" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "DST rehearsal",
  );
  await save(page);
  expect(
    await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) =>
        k.startsWith("eventfuse:v1:workspace:"),
      );
      return JSON.parse(localStorage.getItem(key)).editing.baseline.event
        .referenceInstant;
    }),
  ).toBe("2026-11-01T06:30:00Z");
});

for (const route of [
  "landing",
  "workspace",
  "blueprint",
  "scenario",
  "compare",
  "brief",
]) {
  test(`${route} reflows at 390px with actual 200% text and reduced motion`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 900 });
    await start(page, route);
    const before = await page
      .getByRole("heading", { level: 1 })
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    expect(
      await page
        .getByRole("heading", { level: 1 })
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeCloseTo(before * 2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: `/tmp/eventfuse-phase3b-${route}-390-text200.png`,
      fullPage: true,
    });
  });
}

test("keyboard completes baseline, incident, comparison, preference, brief and save", async ({
  page,
}) => {
  const activate = async (locator) => {
    await locator.focus();
    await page.keyboard.press("Enter");
  };
  const route = async (name) => {
    await activate(
      page
        .getByRole("navigation", { name: "Production workflow" })
        .getByRole("link")
        .nth(["blueprint", "scenario", "compare", "brief"].indexOf(name)),
    );
  };
  await start(page, "landing");
  await activate(
    page.getByRole("link", { name: "Open the fictional demo", exact: true }),
  );
  await route("blueprint");
  const apply = page.getByRole("button", {
    name: "Apply baseline",
    exact: true,
  });
  await apply.focus();
  const focus = await apply.evaluate((el) => {
    const s = getComputedStyle(el);
    return { width: s.outlineWidth, color: s.outlineColor };
  });
  expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(3);
  accept(page);
  await page.keyboard.press("Enter");
  await route("scenario");
  await page
    .getByLabel("Delay from calculated baseline start (minutes)", {
      exact: true,
    })
    .focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("240");
  await activate(
    page.getByRole("button", { name: "Apply delay", exact: true }),
  );
  await expect(
    page.getByRole("region", { name: "Current incident impact" }),
  ).toContainText("19:00");
  await route("compare");
  await activate(
    page.getByRole("button", { name: "Add canonical demo alternatives" }),
  );
  await activate(
    page.getByRole("button", { name: "Mark as preferred proposal" }).first(),
  );
  await route("brief");
  await activate(page.getByRole("button", { name: "Prepare brief snapshot" }));
  await expect(page.getByRole("article")).toContainText("Not entered");
  await activate(
    page.getByRole("button", { name: "Save workspace", exact: true }),
  );
  await expect(
    page.getByText("Workspace saved in this browser.", { exact: true }),
  ).toBeVisible();
});

test("unapplied form navigation and dialog discard can be cancelled", async ({
  page,
}) => {
  await start(page, "scenario");
  const delay = page.getByLabel(
    "Delay from calculated baseline start (minutes)",
    { exact: true },
  );
  await delay.fill("bad");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("navigation", { name: "Production workflow" })
    .getByRole("link")
    .nth(2)
    .click();
  await expect(delay).toHaveValue("bad");
  expect(new URL(page.url()).hash).toBe("#scenario");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.evaluate(() => {
    location.hash = "compare";
  });
  await expect(delay).toHaveValue("bad");
  expect(new URL(page.url()).hash).toBe("#scenario");
  await delay.fill("240");
  await page.getByRole("button", { name: "Apply delay" }).click();
  await go(page, "blueprint");
  await page
    .getByRole("button", { name: "+ Create activity", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Activity name", { exact: true })
    .fill("Unapplied activity");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog").getByLabel("Activity name", { exact: true }),
  ).toHaveValue("Unapplied activity");
  accept(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "+ Create activity", exact: true }),
  ).toBeFocused();
});

test("activity, dependency and milestone CRUD, read-only history and explicit restore use real inputs", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);
  await page
    .getByRole("button", { name: "+ Create local event", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Event name", { exact: true })
    .fill("Independent stage rehearsal");
  await page.getByRole("button", { name: "Create event draft" }).click();
  await go(page, "blueprint");
  for (const [name, duration, kind] of [
    ["Stage preparation", "60", "activity"],
    ["Guest entry", "0", "milestone"],
  ]) {
    await page
      .getByRole("button", { name: "+ Create activity", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Activity name", { exact: true }).fill(name);
    await dialog
      .getByLabel("Duration (minutes)", { exact: true })
      .fill(duration);
    await dialog
      .getByLabel("Activity type", { exact: true })
      .selectOption(kind);
    await dialog.getByRole("button", { name: "Save activity draft" }).click();
  }
  await page
    .getByRole("button", { name: "+ Create dependency", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Predecessor", { exact: true })
    .selectOption({ label: "Stage preparation" });
  await dialog
    .getByLabel("Successor", { exact: true })
    .selectOption({ label: "Guest entry" });
  await dialog.getByRole("button", { name: "Save dependency draft" }).click();
  await page
    .getByRole("button", { name: "+ Create critical milestone", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Critical milestone label", { exact: true })
    .fill("Guest entry deadline");
  await dialog
    .getByLabel("Deadline activity", { exact: true })
    .selectOption({ label: "Guest entry" });
  await dialog
    .getByLabel("Deadline (event local)", { exact: true })
    .fill("2026-10-15T10:00");
  await dialog.getByRole("button", { name: "Save milestone draft" }).click();
  await page
    .getByRole("button", { name: "Validate baseline", exact: true })
    .click();
  await expect(page.getByText("Validation: valid")).toBeVisible();
  await page
    .getByRole("button", { name: "Apply baseline", exact: true })
    .click();
  await expect(
    page.locator("[data-activity]").filter({ hasText: "Guest entry" }).first(),
  ).toContainText("09:00");
  await page
    .getByRole("button", { name: "Edit dependency", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Finish-to-start lag (minutes)", { exact: true })
    .fill("30");
  await page.getByRole("button", { name: "Save dependency draft" }).click();
  await page
    .getByRole("button", { name: "Edit milestone", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Deadline (event local)", { exact: true })
    .fill("2026-10-15T09:45");
  await page.getByRole("button", { name: "Save milestone draft" }).click();
  await page
    .getByRole("button", { name: "Edit Stage preparation", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Duration (minutes)", { exact: true })
    .fill("120");
  await page.getByRole("button", { name: "Save activity draft" }).click();
  accept(page);
  await page
    .getByRole("button", { name: "Apply baseline", exact: true })
    .click();
  await expect(
    page.locator("[data-activity]").filter({ hasText: "Guest entry" }).first(),
  ).toContainText("10:30");
  await expect(
    page.getByText("Deadline breach +45 min", { exact: true }),
  ).toBeVisible();
  await save(page);
  const savedBefore = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith("eventfuse:v1:workspace:"),
    );
    return localStorage.getItem(key);
  });
  await page
    .getByLabel("Historical revision", { exact: true })
    .selectOption({ index: 1 });
  const history = page.getByRole("region", {
    name: "Read-only historical baseline",
  });
  await expect(history).toContainText("09:00");
  await history
    .getByText("Inspect immutable source inputs", { exact: true })
    .click();
  await expect(history.locator("pre")).toContainText('"durationMinutes": 60');
  expect(
    await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) =>
        k.startsWith("eventfuse:v1:workspace:"),
      );
      return localStorage.getItem(key);
    }),
  ).toBe(savedBefore);
  await expect(
    page.getByText("Unapplied baseline draft", { exact: true }),
  ).toHaveCount(0);
  accept(page);
  await page
    .getByRole("button", { name: "Restore revision into draft", exact: true })
    .click();
  await expect(
    page.getByText("Unapplied baseline draft", { exact: true }),
  ).toBeVisible();
  accept(page);
  await page
    .getByRole("button", { name: "Delete dependency", exact: true })
    .click();
  accept(page);
  await page
    .getByRole("button", { name: "Delete milestone", exact: true })
    .click();
  accept(page);
  await page
    .getByRole("button", { name: "Delete Guest entry", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
});

test("long labels and a short keyboard-height viewport preserve readable fields and touch targets", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 400 });
  await start(page, "blueprint");
  await page
    .getByRole("button", { name: "+ Create activity", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Activity name", { exact: true })
    .fill("A deliberately long production activity label ".repeat(4));
  await dialog.getByLabel("Notes", { exact: true }).focus();
  const box = await dialog.getByLabel("Notes", { exact: true }).boundingBox();
  expect(box.y + box.height).toBeLessThanOrEqual(400);
  expect(box.y).toBeGreaterThanOrEqual(0);
  const submit = dialog.getByRole("button", { name: "Save activity draft" });
  await submit.scrollIntoViewIfNeeded();
  const target = await submit.boundingBox();
  expect(target.height).toBeGreaterThanOrEqual(44);
  expect(target.width).toBeGreaterThanOrEqual(44);
  await submit.click();
  await expect(
    page.getByRole("heading", {
      name: "A deliberately long production activity label ".repeat(4).trim(),
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
});

test("clear preference, graph view controls, revision refresh and landing demo entry stay functional", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await start(page, "compare");
  await preferA(page);
  await page
    .getByRole("button", { name: "Clear preference", exact: true })
    .click();
  await expect(
    page.getByText("No proposal preferred. Nothing is selected automatically."),
  ).toBeVisible();
  await go(page, "blueprint");
  const graph = page.getByRole("region", {
    name: "Activity dependency explorer",
    exact: true,
  });
  const node = graph.locator('.react-flow__node[data-id="power"]');
  await expect(node).toBeVisible();
  const box = await node.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 50,
    box.y + box.height / 2 + 30,
    { steps: 8 },
  );
  await page.mouse.up();
  for (const label of ["Zoom In", "Zoom Out", "Fit View"])
    await graph.getByRole("button", { name: label, exact: true }).click();
  await save(page);
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    demoKey,
  );
  expect(
    saved.editing.baseline.activities.find((a) => a.id === "power")
      .earliestStartMinute,
  ).toBe(0);
  expect(
    saved.editing.baseline.activities.find((a) => a.id === "power")
      .durationMinutes,
  ).toBe(120);
  expect(saved.editing.baseline.dependencies).toHaveLength(6);
  await page.getByRole("button", { name: "Open graph explorer ↗" }).click();
  await expect(
    page.getByRole("dialog").locator(".react-flow__node"),
  ).toHaveCount(6);
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Events", exact: true }).click();
  await page
    .getByRole("button", { name: "Refresh events", exact: true })
    .click();
  await page
    .getByRole("button", { name: "+ Create local event", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Event name", { exact: true })
    .fill("Local event before demo return");
  await page.getByRole("button", { name: "Create event draft" }).click();
  await save(page);
  await page.getByRole("link", { name: "About", exact: true }).click();
  await page
    .getByRole("link", { name: "Open the fictional demo", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Fictional corporate product launch",
  );
});

test("incident drafts persist separately from explicitly applied incidents", async ({
  page,
}) => {
  await start(page, "scenario");
  await page
    .getByLabel("Delay from calculated baseline start (minutes)", {
      exact: true,
    })
    .fill("60");
  await page
    .getByRole("button", { name: "Save incident draft", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Current incident impact" }),
  ).not.toContainText("19:00");
  await save(page);
  await page.reload();
  await expect(
    page.getByLabel("Delay from calculated baseline start (minutes)", {
      exact: true,
    }),
  ).toHaveValue("60");
  await expect(
    page.getByRole("region", { name: "Current incident impact" }),
  ).not.toContainText("19:00");
  await page.getByRole("button", { name: "Apply delay", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Current incident impact" }),
  ).toContainText("17:00");
  await expect(
    page.getByRole("region", { name: "Current incident impact" }),
  ).toContainText("On target");
});

test("landing navigation and all demo entry CTAs reach their stated destinations", async ({
  page,
}) => {
  await start(page, "landing");
  await page.getByRole("link", { name: "Why EventFuse", exact: true }).click();
  await expect(page.locator("#why")).toBeInViewport();
  await page.getByRole("link", { name: "The workflow", exact: true }).click();
  await expect(page.locator("#workflow")).toBeInViewport();
  await page.getByRole("link", { name: "EventFuse", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
  for (const name of [
    "Open demo",
    "Open the fictional demo",
    "Open demo · no account required",
  ]) {
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Fictional corporate product launch",
    );
    await page.getByRole("link", { name: "About", exact: true }).click();
  }
});

test("unsaved workspaces can be resumed after switching to the demo", async ({
  page,
}) => {
  await start(page);
  await page
    .getByRole("button", { name: "+ Create local event", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Event name", { exact: true })
    .fill("Unsaved stage rehearsal");
  await page.getByRole("button", { name: "Create event draft" }).click();
  accept(page);
  await page
    .getByRole("button", { name: "Open fictional demo", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Fictional corporate product launch",
  );
  await page
    .getByRole("button", {
      name: "Resume Unsaved stage rehearsal",
      exact: true,
    })
    .click({ timeout: 5000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Unsaved stage rehearsal",
  );
  await expect(
    page.getByRole("region", { name: "Workspace saving" }),
  ).toHaveCount(1);
  await save(page);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Unsaved stage rehearsal",
  );
});
