import { expect, type Page, test } from "@playwright/test";

const catalogSongs = [
  ["000", "メリーさんの羊"],
  ["010", "ぶんぶんぶん"],
  ["020", "聖者の行進"],
  ["030", "喜びの歌（D major）"],
  ["040", "カエルの合唱"],
  ["041", "カエルの合唱 左手 Lv.1"],
  ["042", "カエルの合唱 左手 Lv.2"],
  ["043", "カエルの合唱 左手 Lv.3"],
  ["044", "カエルの合唱 左手 Lv.4"],
  ["045", "カエルの合唱 左手 Lv.5"],
  ["046", "カエルの合唱 左手 Lv.6"],
  ["047", "カエルの合唱 左手 Lv.7"],
  ["048", "カエルの合唱 左手 Lv.8"],
  ["049", "カエルの合唱 左手 Lv.9"],
  ["050", "きらきら星"],
  ["901", "ドからソまで"],
  ["902", "ド♯とレ♭"],
] as const;

const frogSongIds = new Set([
  "040",
  "041",
  "042",
  "043",
  "044",
  "045",
  "046",
  "047",
  "048",
  "049",
]);
const homeVisibleSongIds = new Set([
  "000",
  "010",
  "020",
  "030",
  "040",
  "041",
  "050",
]);

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
  await expect(page.locator(".catalog-list")).toHaveCount(4);

  for (const [id, title] of catalogSongs) {
    const card = page.locator(`[data-song-id="${id}"]`);
    const isHomeVisible = homeVisibleSongIds.has(id);
    const groupName = frogSongIds.has(id)
      ? "カエルの合唱"
      : ["000", "010", "020", "030"].includes(id)
        ? "ポジション移動なし"
        : id === "050"
          ? "ポジション移動あり"
          : "開発確認";

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
    if (id === "040") {
      await expect(card).toHaveAttribute("data-series-title", "カエルの合唱");
      await expect(card).toHaveAttribute("data-part", "right");
      await expect(card).toContainText("右手");
    }
    if (id === "041") {
      await expect(card).toHaveAttribute("data-series-title", "カエルの合唱");
      await expect(card).toHaveAttribute("data-part", "left");
      await expect(card).toContainText("左手 Lv.1");
    }
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
  await expect(page.locator(".catalog-section")).toHaveCount(4);

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
