import { test, expect } from "@playwright/test";

for (const route of [
  "landing",
  "workspace",
  "blueprint",
  "scenario",
  "compare",
  "brief",
]) {
  test(`${route} rendered text meets AA contrast in the approved palette`, async ({
    page,
  }, testInfo) => {
    await page.goto(`/#${route}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d");
      const rgba = (color) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data].map((v, i) =>
          i === 3 ? v / 255 : v,
        );
      };
      const over = (fg, bg) =>
        [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
      const linear = (v) => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      const lum = (c) =>
        0.2126 * linear(c[0]) + 0.7152 * linear(c[1]) + 0.0722 * linear(c[2]);
      const ratio = (a, b) =>
        (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
      let checked = 0;
      const failures = [];
      for (const el of document.querySelectorAll("body *")) {
        const style = getComputedStyle(el),
          rect = el.getBoundingClientRect();
        if (
          !rect.width ||
          !rect.height ||
          ["SCRIPT", "STYLE", "svg", "path"].includes(el.tagName) ||
          el.closest('[aria-hidden="true"],button:disabled,[data-disabled]')
        )
          continue;
        if (
          ![...el.childNodes].some(
            (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim(),
          )
        )
          continue;
        let bg = [255, 255, 255, 1];
        const layers = [];
        for (let ancestor = el; ancestor; ancestor = ancestor.parentElement)
          layers.unshift(rgba(getComputedStyle(ancestor).backgroundColor));
        for (const layer of layers) bg = over(layer, bg);
        const actual = ratio(over(rgba(style.color), bg), bg),
          large =
            parseFloat(style.fontSize) >= 24 ||
            (parseFloat(style.fontSize) >= 18.66 &&
              Number(style.fontWeight) >= 700);
        checked++;
        if (actual < (large ? 3 : 4.5))
          failures.push({
            text: el.textContent.trim().slice(0, 80),
            ratio: actual,
            color: style.color,
            background: bg,
          });
      }
      return {
        checked,
        failures,
        scope:
          "Visible direct text nodes; canvas resolves computed colors and ancestor alpha backgrounds. Disabled controls excluded. No text is placed over images.",
      };
    });
    await testInfo.attach("rendered-text-contrast", {
      body: JSON.stringify(result),
      contentType: "application/json",
    });
    expect(result.checked).toBeGreaterThan(20);
    expect(result.failures).toEqual([]);
  });
}
