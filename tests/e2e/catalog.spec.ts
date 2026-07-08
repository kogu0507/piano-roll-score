import { expect, test } from "@playwright/test";

const catalogSongs = [
  ["001", "メリーさんの羊"],
  ["002", "カエルの合唱"],
  ["003", "喜びの歌（D major）"],
  ["004", "きらきら星"],
  ["005", "ぶんぶんぶん"],
  ["006", "聖者の行進（アウフタクト）"],
  ["901", "ドからソまで"],
  ["902", "ド♯とレ♭"],
] as const;

test("catalog.htmlに全曲が載り、相対リンクから各曲を開ける", async ({
  page,
}) => {
  await page.goto("./catalog.html");
  await expect(page).toHaveTitle("piano-roll-score 曲一覧");
  await expect(page.getByRole("heading", { name: "piano-roll-score 曲一覧" })).toBeVisible();

  for (const [id, title] of catalogSongs) {
    const row = page.locator(`[data-song-id="${id}"]`);

    await expect(row).toContainText(id);
    await expect(row).toContainText(title);
    await expect(row).toContainText(
      `https://seegmund-music-labo.com/app/piano-roll-score/?id=${id}`,
    );
    await expect(row.getByRole("link", { name: "開く" })).toHaveAttribute(
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
