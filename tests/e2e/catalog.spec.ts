import { expect, type Page, test } from "@playwright/test";

const catalogSongs = [
  ["001", "メリーさんの羊"],
  ["002", "カエルの合唱"],
  ["003", "喜びの歌（D major）"],
  ["004", "きらきら星"],
  ["005", "ぶんぶんぶん"],
  ["006", "聖者の行進"],
  ["007", "カエルの合唱 左手"],
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

async function expectCardsDoNotOverlap(page: Page) {
  const cardRects = await page.locator(".song-card").evaluateAll((cards) => {
    return cards.map((card) => {
      const rect = card.getBoundingClientRect();

      return {
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
      };
    });
  });

  for (const [index, rect] of cardRects.entries()) {
    expect(rect.height).toBeGreaterThan(0);

    if (index > 0) {
      const previous = cardRects[index - 1];
      if (previous === undefined) {
        throw new Error("前のカード位置を取得できませんでした。");
      }
      expect(rect.top).toBeGreaterThanOrEqual(previous.bottom - 1);
    }
  }
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
  await expect(page.locator(".catalog-list")).toHaveCount(3);

  for (const [id, title] of catalogSongs) {
    const card = page.locator(`[data-song-id="${id}"]`);
    const isHomeVisible = !["901", "902"].includes(id);
    const groupName =
      id === "007" ? "左手教材" : isHomeVisible ? "サンプル曲" : "開発確認";

    await expect(card).toContainText(id);
    await expect(card).toContainText(title);
    await expect(card).toHaveAttribute(
      "data-visible-in-home",
      String(isHomeVisible),
    );
    await expect(
      page.locator(
        `.catalog-section[data-catalog-group="${groupName}"] [data-song-id="${id}"]`,
      ),
    ).toHaveCount(1);
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

test("catalog.htmlはカード内バッジを重複させない", async ({ page }) => {
  await page.goto("./catalog.html");

  const badgeTexts = await page
    .locator('[data-song-id="901"] .song-card__badge')
    .allTextContents();
  const normalizedBadgeTexts = badgeTexts.map((text) => text.trim());

  expect(
    normalizedBadgeTexts.filter((text) => text === "開発確認"),
  ).toHaveLength(1);
  expect(normalizedBadgeTexts).toContain("カタログのみ");
});

test("catalog.htmlからホームへ戻れる", async ({ page }) => {
  await page.goto("./catalog.html");
  await page.getByRole("link", { name: "ホームへ戻る" }).click();

  await expect(page.getByTestId("song-select")).toBeVisible();
  await expect(page.getByRole("link", { name: "曲カタログ" })).toBeVisible();
});

test("catalog.htmlは全画面幅で1列カード配置になり横スクロールしない", async ({
  page,
}) => {
  await page.goto("./catalog.html");

  await expectNoHorizontalOverflow(page);
  await expectCardsDoNotOverlap(page);
  await expect(page.locator(".catalog-section")).toHaveCount(3);

  const firstCatalogList = page.locator(".catalog-list").first();
  const columnCount = await firstCatalogList.evaluate((element) => {
    return getComputedStyle(element)
      .gridTemplateColumns.split(" ")
      .filter((column) => column.trim().length > 0).length;
  });

  expect(columnCount).toBe(1);

  await page.locator(".direct-url").evaluateAll((detailsElements) => {
    detailsElements.forEach((element) => {
      (element as HTMLDetailsElement).open = true;
    });
  });
  await expectNoHorizontalOverflow(page);
  await expectCardsDoNotOverlap(page);
});
