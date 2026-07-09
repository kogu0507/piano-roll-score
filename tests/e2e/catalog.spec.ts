import { expect, type Page, test } from "@playwright/test";

const catalogSongs = [
  ["001", "メリーさんの羊"],
  ["002", "カエルの合唱"],
  ["003", "喜びの歌（D major）"],
  ["004", "きらきら星"],
  ["005", "ぶんぶんぶん"],
  ["006", "聖者の行進"],
  ["901", "ドからソまで"],
  ["902", "ド♯とレ♭"],
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const documentElement = document.documentElement;
    const body = document.body;

    return Math.max(
      documentElement.scrollWidth - documentElement.clientWidth,
      body.scrollWidth - documentElement.clientWidth,
    );
  });

  expect(overflow).toBeLessThanOrEqual(1);
}

test("catalog.htmlに全曲が載り、相対リンクから各曲を開ける", async ({
  page,
}) => {
  await page.goto("./catalog.html");
  await expect(page).toHaveTitle("piano-roll-score 曲一覧");
  await expect(
    page.getByRole("heading", { name: "piano-roll-score 曲一覧" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "ホームへ戻る" })).toHaveAttribute(
    "href",
    "./",
  );
  await expect(page.locator("table")).toHaveCount(0);
  await expect(page.locator(".song-card")).toHaveCount(catalogSongs.length);

  for (const [id, title] of catalogSongs) {
    const card = page.locator(`[data-song-id="${id}"]`);
    const isHomeVisible = !["901", "902"].includes(id);

    await expect(card).toContainText(id);
    await expect(card).toContainText(title);
    await expect(card).toHaveAttribute(
      "data-visible-in-home",
      String(isHomeVisible),
    );
    await expect(card).toContainText(isHomeVisible ? "サンプル曲" : "開発確認");
    await expect(card).toContainText(
      isHomeVisible ? "ホーム表示" : "カタログのみ",
    );
    await card.locator(".direct-url").evaluate((element) => {
      (element as HTMLDetailsElement).open = true;
    });
    await expect(card.locator(".direct-url code")).toContainText(
      `https://seegmund-music-labo.com/app/piano-roll-score/?id=${id}`,
    );
    await expect(card.getByRole("link", { name: "開く" })).toHaveAttribute(
      "href",
      `./?id=${id}`,
    );
  }

  for (const [id, title] of catalogSongs) {
    await page.goto("./catalog.html");
    await page
      .locator(`[data-song-id="${id}"]`)
      .getByRole("link", { name: "開く" })
      .click();

    await expect(page.getByTestId("song-select")).toHaveValue(`builtin:${id}`);
    await expect(page.getByTestId("song-detail")).toContainText(title);
  }
});

test("catalog.htmlからホームへ戻れる", async ({ page }) => {
  await page.goto("./catalog.html");
  await page.getByRole("link", { name: "ホームへ戻る" }).click();

  await expect(page.getByTestId("song-select")).toBeVisible();
  await expect(page.getByRole("link", { name: "曲カタログ" })).toBeVisible();
});

test("catalog.htmlはカード配置で画面幅に追従し横スクロールしない", async ({
  page,
}) => {
  await page.goto("./catalog.html");

  await expectNoHorizontalOverflow(page);
  await expect(page.locator(".catalog-section")).toHaveCount(2);

  const firstCardList = page.locator(".catalog-card-list").first();
  const columnCount = await firstCardList.evaluate((element) => {
    return getComputedStyle(element)
      .gridTemplateColumns.split(" ")
      .filter((column) => column.trim().length > 0).length;
  });
  const viewportWidth = page.viewportSize()?.width ?? 0;

  if (viewportWidth <= 520) {
    expect(columnCount).toBe(1);
  } else {
    expect(columnCount).toBeGreaterThan(1);
  }
});
