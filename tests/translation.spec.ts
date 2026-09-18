import { expect, test } from "@playwright/test";

function googleResponse(text: string, source: string) {
  return JSON.stringify([[[text, null, null, null]], null, source]);
}

test("a completed translation appears immediately and survives the other timeout", async ({ page }) => {
  await page.clock.install();
  await page.route("https://translate.googleapis.com/**", async (route) => {
    if (new URL(route.request().url()).searchParams.get("tl") === "kk") {
      await route.fulfill({ status: 200, contentType: "application/json", body: googleResponse("Сәлем", "tk") });
    }
    // Leave the other request pending until the app aborts it.
  });
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("data-ready", "true");
  await page.locator("#source-text").fill("Salam");
  await page.locator(".translate-button").click();
  await expect(page.locator('[data-target-language="kk"] p')).toHaveText("Сәлем");
  await expect(page.locator(".translate-button")).toBeDisabled();
  await page.clock.fastForward(16000);
  await expect(page.locator('[data-target-language="ru"] p')).toHaveText("Аударма уақыты аяқталды. Қайта көріңіз.");
  await expect(page.locator('[data-target-language="kk"] p')).toHaveText("Сәлем");
  await expect(page.locator(".translate-button")).toBeEnabled();
});

test("selected source language stays in sync with the translator", async ({ page }) => {
  const requests: Array<{ source: string | null; target: string | null }> = [];
  await page.route("https://translate.googleapis.com/**", async (route) => {
    const url = new URL(route.request().url());
    requests.push({ source: url.searchParams.get("sl"), target: url.searchParams.get("tl") });
    await route.fulfill({ status: 200, contentType: "application/json", body: googleResponse(`translated-${url.searchParams.get("tl")}`, url.searchParams.get("sl") ?? "") });
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
  expect(requests).toEqual([
    { source: "mn", target: "kk" },
    { source: "mn", target: "ru" },
  ]);
});

test("Kazakh and Russian never translate into themselves", async ({ page }) => {
  const requests: string[] = [];
  await page.route("https://translate.googleapis.com/**", async (route) => {
    const url = new URL(route.request().url());
    requests.push(`${url.searchParams.get("sl")}->${url.searchParams.get("tl")}`);
    await route.fulfill({ status: 200, contentType: "application/json", body: googleResponse("ok", url.searchParams.get("sl") ?? "") });
  });

  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "Қазақша тілінен аудару" }).click();
  await page.locator("#source-text").fill("Сәлем");
  await page.getByRole("button", { name: "АУДАРУ →" }).click();
  await expect(page.locator('[data-target-language="tk"] p')).toHaveText("ok");
  await expect(page.locator('[data-target-language="ru"] p')).toHaveText("ok");

  await page.getByRole("button", { name: "Русский тілінен аудару" }).click();
  await page.locator("#source-text").fill("Привет");
  await page.getByRole("button", { name: "АУДАРУ →" }).click();
  await expect(page.locator('[data-target-language="kk"] p')).toHaveText("ok");
  await expect(page.locator('[data-target-language="tk"] p')).toHaveText("ok");

  expect(requests).toEqual(["kk->tk", "kk->ru", "ru->kk", "ru->tk"]);
});

test("editing text cancels a stale translation", async ({ page }) => {
  let releaseFirstRequest: (() => void) | undefined;
  const firstRequestPending = new Promise<void>((resolve) => { releaseFirstRequest = resolve; });
  await page.route("https://translate.googleapis.com/**", async (route) => {
    await firstRequestPending;
    await route.fulfill({ status: 200, contentType: "application/json", body: googleResponse("old result", "tk") }).catch(() => undefined);
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
