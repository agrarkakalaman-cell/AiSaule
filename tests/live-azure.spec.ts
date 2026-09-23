import { expect, test } from "@playwright/test";

test("live Azure translates Uzbek into Kazakh and Kyrgyz", async ({ page }) => {
  test.skip(process.env.RUN_LIVE_AZURE !== "1", "Set RUN_LIVE_AZURE=1 for the release smoke test.");

  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("data-ready", "true");
  await page.locator('button.language[title="O‘zbekcha"]').click();
  await page.locator(".target-language-select").selectOption("ky");
  await page.locator("#source-text").fill("uyda kim bor kattalar bormi?");
  await page.locator(".translate-button").click();

  await expect(page.locator('[data-target-language="kk"] p')).not.toHaveClass("translation-error", { timeout: 40_000 });
  await expect(page.locator('[data-target-language="ky"] p')).not.toHaveClass("translation-error", { timeout: 40_000 });
  await expect(page.locator('[data-target-language="kk"] p')).not.toHaveText("Аударма осында шығады");
  await expect(page.locator('[data-target-language="ky"] p')).not.toHaveText("Аударма осында шығады");
});
