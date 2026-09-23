import { expect, test } from "@playwright/test";

test("a translation request times out cleanly", async ({ page }) => {
  await page.clock.install();
  await page.route("http://127.0.0.1:8001/translate", async () => {});
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("data-ready", "true");
  await page.locator("#source-text").fill("Salam");
  await page.locator(".translate-button").click();
  await expect(page.locator(".translate-button")).toBeDisabled();
  await page.clock.fastForward(36000);
  await expect(page.locator('[data-target-language="kk"] p')).toHaveText("Аударма уақыты аяқталды. Қайта көріңіз.");
  await expect(page.locator('[data-target-language="ru"] p')).toHaveText("Аударма уақыты аяқталды. Қайта көріңіз.");
  await expect(page.locator(".translate-button")).toBeEnabled();
});

test("selected source language stays in sync with the translator", async ({ page }) => {
  const requests: Array<{ source: string; targets: string[] }> = [];
  await page.route("http://127.0.0.1:8001/translate", async (route) => {
    const body = route.request().postDataJSON() as { source: string; targets: string[] };
    requests.push({ source: body.source, targets: body.targets });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ translations: { kk: "translated-kk", ru: "translated-ru" } }) });
  });

  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "Монгол тілінен аудару" }).click();
  await expect(page.getByRole("heading", { name: /Монгол мәтін/ })).toBeVisible();
  await expect(page.locator("#source-text")).toHaveAttribute("placeholder", "Монгол текст оруулна уу...");
  await page.locator("#source-text").fill("Сайн байна уу?");
  await page.getByRole("button", { name: "АУДАРУ →" }).click();
  await expect(page.locator('[data-target-language="kk"] p')).toHaveText("translated-kk");
  await expect(page.locator('[data-target-language="ru"] p')).toHaveText("translated-ru");
  expect(requests).toEqual([{ source: "mn", targets: ["kk", "ru"] }]);
});

test("Kazakh stays first and the second target follows the selector", async ({ page }) => {
  const requests: Array<{ source: string; targets: string[] }> = [];
  await page.route("http://127.0.0.1:8001/translate", async (route) => {
    const body = route.request().postDataJSON() as { source: string; targets: string[] };
    requests.push({ source: body.source, targets: body.targets });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ translations: Object.fromEntries(body.targets.map((target) => [target, target === body.source ? "Сәлем" : "ok"])) }) });
  });

  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "Қазақша тілінен аудару" }).click();
  await page.locator("#source-text").fill("Сәлем");
  await page.getByRole("button", { name: "АУДАРУ →" }).click();
  await expect(page.locator('[data-target-language="kk"] p')).toHaveText("Сәлем");
  await expect(page.locator('[data-target-language="ru"] p')).toHaveText("ok");

  await page.getByRole("button", { name: "Русский тілінен аудару" }).click();
  await page.getByRole("combobox", { name: "Екінші аударма тілі" }).selectOption("en");
  await page.locator("#source-text").fill("Привет");
  await page.getByRole("button", { name: "АУДАРУ →" }).click();
  await expect(page.locator('[data-target-language="kk"] p')).toHaveText("ok");
  await expect(page.locator('[data-target-language="en"] p')).toHaveText("ok");

  expect(requests).toEqual([
    { source: "kk", targets: ["kk", "ru"] },
    { source: "ru", targets: ["kk", "en"] },
  ]);
});

test("editing text cancels a stale translation", async ({ page }) => {
  let releaseFirstRequest: (() => void) | undefined;
  const firstRequestPending = new Promise<void>((resolve) => { releaseFirstRequest = resolve; });
  await page.route("http://127.0.0.1:8001/translate", async (route) => {
    await firstRequestPending;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ translations: { kk: "old result", ru: "old result" } }) }).catch(() => undefined);
  });

  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("data-ready", "true");
  await page.locator("#source-text").fill("Köne tekst");
  await page.getByRole("button", { name: "АУДАРУ →" }).click();
  await page.locator("#source-text").fill("Täze tekst");
  releaseFirstRequest?.();
  await expect(page.locator('[data-target-language="kk"] p')).toHaveText("Аударма осында шығады");
  await expect(page.locator('[data-target-language="ru"] p')).toHaveText("Перевод появится здесь");
});

test("speech controls are disabled for languages Azure Speech does not support", async ({ page }) => {
  await page.route("http://127.0.0.1:8001/translate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ translations: { kk: "Сәлем", ky: "Салам" } }),
    });
  });

  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("data-ready", "true");
  await page.getByRole("combobox", { name: "Екінші аударма тілі" }).selectOption("ky");
  await page.locator("#source-text").fill("Salam");
  await page.getByRole("button", { name: "АУДАРУ →" }).click();

  await expect(page.getByRole("button", { name: "Қазақша аудармасын тыңдау" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Кыргызча аудармасын тыңдау" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Кыргызча аудармасын MP3 форматында жүктеу" })).toBeDisabled();
});

test("Dari uses the Azure prs code and unsupported Tajik is not offered", async ({ page }) => {
  const requests: Array<{ source: string; targets: string[] }> = [];
  await page.route("http://127.0.0.1:8001/translate", async (route) => {
    const body = route.request().postDataJSON() as { source: string; targets: string[] };
    requests.push({ source: body.source, targets: body.targets });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ translations: { kk: "Сәлеметсіз бе", ru: "Здравствуйте" } }),
    });
  });

  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("data-ready", "true");
  await expect(page.locator('.target-language-select option[value="tg"]')).toHaveCount(0);
  await page.getByRole("button", { name: "دری — Ауғанстан тілінен аудару" }).click();
  await page.locator("#source-text").fill("سلام");
  await page.getByRole("button", { name: "АУДАРУ →" }).click();
  await expect(page.locator('[data-target-language="kk"] p')).toHaveText("Сәлеметсіз бе");
  expect(requests).toEqual([{ source: "prs", targets: ["kk", "ru"] }]);
});

test("daily vocabulary rotates and follows the selected language", async ({ page }) => {
  await page.clock.install();
  await page.route("**/translate", (route) => route.abort());
  await page.route("**/speech", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("data-ready", "true");

  await page.getByRole("button", { name: "English тілінен аудару" }).click();
  await expect(page.locator(".dictionary-label span")).toHaveText("English");
  await expect(page.locator(".dictionary-pages span")).toHaveText("1–3 / 300");
  await expect(page.locator(".dictionary-row").first().locator("span").last()).toHaveText("Hi!");

  await page.clock.fastForward(6_100);
  await expect(page.locator(".dictionary-pages span")).toHaveText("4–6 / 300");
  await expect(page.locator(".dictionary-row").first().locator("span").last()).toHaveText("Good day!");

  await page.getByRole("button", { name: "O‘zbekcha тілінен аудару" }).click();
  await expect(page.locator(".dictionary-label span")).toHaveText("O‘zbekcha");
  await expect(page.locator(".dictionary-pages span")).toHaveText("1–3 / 300");
  await expect(page.locator(".dictionary-row").first().locator("span").last()).toHaveText("Salom!");
});
