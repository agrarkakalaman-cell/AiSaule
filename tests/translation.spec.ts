import { expect, test } from "@playwright/test";

test("a translation request times out cleanly", async ({ page }) => {
  await page.clock.install();
  await page.route("http://127.0.0.1:8001/translate", async () => {});
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("data-ready", "true");
  await page.locator('button.language[title="Қазақша"]').click();
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
  await page.locator('button.language[title="Монгол"]').click();
  await expect(page.locator(".translator-input-head strong")).toHaveText("Монгол");
  await expect(page.locator("#source-text")).toHaveAttribute("placeholder", "Монгол текст оруулна уу...");
  await page.locator("#source-text").fill("Сайн байна уу?");
  await page.locator(".translate-button").click();
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
  await page.locator('button.language[title="Қазақша"]').click();
  await page.locator("#source-text").fill("Сәлем");
  await page.locator(".translate-button").click();
  await expect(page.locator('[data-target-language="kk"] p')).toHaveText("Сәлем");
  await expect(page.locator('[data-target-language="ru"] p')).toHaveText("ok");

  await page.locator('button.language[title="Русский"]').click();
  await page.locator(".target-language-select").selectOption("en");
  await page.locator("#source-text").fill("Привет");
  await page.locator(".translate-button").click();
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
  await page.locator('button.language[title="Қазақша"]').click();
  await page.locator("#source-text").fill("Köne tekst");
  await page.locator(".translate-button").click();
  await page.locator("#source-text").fill("Täze tekst");
  releaseFirstRequest?.();
  await expect(page.locator('[data-target-language="kk"] p')).toHaveText("Аударма осында шығады");
  await expect(page.locator('[data-target-language="ru"] p')).toHaveText("Аударма осында шығады");
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
  await page.locator(".target-language-select").selectOption("ky");
  await page.locator("#source-text").fill("Salam");
  await page.locator(".translate-button").click();

  await expect(page.locator('[data-target-language="kk"] .speech-button').first()).toBeEnabled();
  await expect(page.locator('[data-target-language="ky"] .speech-button').first()).toBeDisabled();
  await expect(page.locator('[data-target-language="ky"] .speech-button').last()).toBeDisabled();
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
  await page.locator('button.language[title="دری — Ауғанстан"]').click();
  await page.locator("#source-text").fill("سلام");
  await page.locator(".translate-button").click();
  await expect(page.locator('[data-target-language="kk"] p')).toHaveText("Сәлеметсіз бе");
  expect(requests).toEqual([{ source: "prs", targets: ["kk", "ru"] }]);
});

test("daily vocabulary rotates and follows the selected language", async ({ page }) => {
  await page.clock.install();
  await page.route("**/translate", (route) => route.abort());
  await page.route("**/speech", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("data-ready", "true");

  await page.locator('button.language[title="English"]').click();
  await expect(page.locator(".dictionary-label span")).toHaveText("English");
  await expect(page.locator(".dictionary-pages span")).toHaveText("1–3 / 300");
  await expect(page.locator(".dictionary-row").first().locator("span").last()).toHaveText("Hi!");

  await page.clock.fastForward(6_100);
  await expect(page.locator(".dictionary-pages span")).toHaveText("4–6 / 300");
  await expect(page.locator(".dictionary-row").first().locator("span").last()).toHaveText("Good day!");

  await page.locator('button.language[title="O‘zbekcha"]').click();
  await expect(page.locator(".dictionary-label span")).toHaveText("O‘zbekcha");
  await expect(page.locator(".dictionary-pages span")).toHaveText("1–3 / 300");
  await expect(page.locator(".dictionary-row").first().locator("span").last()).toHaveText("Salom!");
});

test("language bar stays visible and the selected language localizes the site", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("data-ready", "true");
  const languageBar = page.locator(".utility-bar");
  await expect(languageBar).toHaveCSS("position", "sticky");

  await page.locator('button.language[title="English"]').click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.locator(".utility-inner > span")).toHaveText("Kazakh National Agrarian Research University");
  await expect(page.locator("#hero-title")).toContainText("Kazakh");
  await expect(page.locator(".translate-button")).toHaveText("TRANSLATION →");
  await expect(page.locator(".department-credit")).toHaveText("Department of Artificial Intelligence and Digital Transformation");
  await expect(page.locator(".department-credit span")).toHaveCount(0);

  await page.locator('button.language[title="Русский"]').click();
  await expect(page.locator(".department-credit")).toHaveText("Отдел искусственного интеллекта и цифровой трансформации");

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(async () => Math.round((await languageBar.boundingBox())?.y ?? -1)).toBe(0);
});

test("switching Pashto, Belarusian and Hungarian keeps the page layout fixed", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("data-ready", "true");
  const dictionary = page.locator(".hero-dictionary");
  const initialX = Math.round((await dictionary.boundingBox())?.x ?? -1);

  for (const title of ["پښتو — Ауғанстан", "Беларуская", "Magyar"]) {
    await page.locator(`button.language[title="${title}"]`).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("main")).toHaveAttribute("dir", "ltr");
    await expect.poll(async () => Math.round((await dictionary.boundingBox())?.x ?? -1)).toBe(initialX);
  }
});

test("long dictionary copy wraps inside its card", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("data-ready", "true");
  await page.locator('button.language[title="Magyar"]').click();
  const nextWords = page.locator(".dictionary-pages button").last();
  await nextWords.click();
  await nextWords.click();
  await nextWords.click();
  const dictionary = page.locator(".hero-dictionary");
  await expect.poll(() => dictionary.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
});
