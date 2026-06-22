import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );

  expect(hasHorizontalOverflow).toBe(false);
}

test("IDなしで内蔵サンプル一覧を表示する", async ({ page }) => {
  await page.goto("./");

  await expect(
    page.getByRole("heading", { level: 1, name: "piano-roll-score" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "内蔵サンプル" }),
  ).toBeVisible();
  await expect(page.getByText("ドからソまで")).toBeVisible();
  await expect(page.getByText("ド♯とレ♭")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("URLで指定した内蔵曲を読み込む", async ({ page }) => {
  await page.goto("./?id=001");
  await expect(
    page.getByRole("heading", { level: 2, name: "ドからソまで" }).first(),
  ).toBeVisible();
  await expect(page.getByText("80 BPM")).toBeVisible();

  await page.goto("./?id=002");
  await expect(
    page.getByRole("heading", { level: 2, name: "ド♯とレ♭" }).first(),
  ).toBeVisible();
  await expect(page.getByText("2件")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("存在しないIDでもエラーとサンプル一覧を表示する", async ({
  page,
}) => {
  await page.goto("./?id=missing");

  await expect(
    page.getByRole("alert").filter({
      hasText: "指定された内蔵曲が見つかりません。",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "内蔵サンプル" }),
  ).toBeVisible();
  await expect(page.getByText("ドからソまで")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("不正なIDでもエラーとサンプル一覧を表示する", async ({ page }) => {
  await page.goto("./?id=../001");

  await expect(
    page.getByRole("alert").filter({
      hasText: "URLの曲IDが正しくありません。",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "内蔵サンプル" }),
  ).toBeVisible();
});
