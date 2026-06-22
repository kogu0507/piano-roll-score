import { expect, test } from "@playwright/test";

test("最小ロード画面を横スクロールなしで表示する", async ({ page }) => {
  await page.goto("./");

  await expect(
    page.getByRole("heading", { level: 1, name: "piano-roll-score" }),
  ).toBeVisible();
  await expect(page.getByText("現在、開発基盤を構築中です。")).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );

  expect(hasHorizontalOverflow).toBe(false);
});
