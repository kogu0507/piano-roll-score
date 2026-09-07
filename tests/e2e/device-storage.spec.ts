import { expect, test, type Page } from "@playwright/test";

function getJsonEditor(page: Page) {
  return page.locator("#song-json");
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
}

async function openDataManagement(page: Page): Promise<void> {
  const details = page.getByTestId("data-management");
  const isOpen = await details.evaluate(
    (element) => (element as HTMLDetailsElement).open,
  );

  if (!isOpen) {
    await details.locator("summary").click();
  }
}

test("検証済み楽曲を明示操作で端末内保存し、再読み込み後も読み込みと削除ができる", async ({
  page,
}) => {
  await page.goto("./?id=000");

  await expect(getJsonEditor(page)).toHaveValue(/"id": "000"/);
  await openDataManagement(page);
  await expect(page.getByText(
    "この端末のこのブラウザ内だけ",
  )).toBeVisible();
  await expect(page.getByTestId("saved-song-item")).toHaveCount(0);
  await expect(page.getByText("保存された楽曲はまだありません。")).toBeVisible();

  await page.getByTestId("save-song-button").click();
  await expect(page.getByTestId("saved-song-item")).toHaveCount(1);
  await expect(page.getByTestId("saved-song-list")).toContainText("更新:");
  await expect(page.getByTestId("saved-song-status")).toContainText(
    "端末内へ保存しました",
  );

  await page.reload();
  await openDataManagement(page);
  await expect(page.getByTestId("saved-song-item")).toHaveCount(1);
  await expect(getJsonEditor(page)).toHaveValue(/"id": "000"/);

  await getJsonEditor(page).fill('{"edited":true}');
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    await dialog.accept();
  });
  await page.getByTestId("saved-song-load").click();
  await expect(getJsonEditor(page)).toHaveValue(/"id": "000"/);
  await expect(page.getByTestId("saved-song-status")).toContainText(
    "保存一覧から読み込みました",
  );

  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    await dialog.dismiss();
  });
  await page.getByTestId("saved-song-delete").click();
  await expect(page.getByTestId("saved-song-item")).toHaveCount(1);
  await expect(page.getByTestId("saved-song-status")).toContainText(
    "キャンセル",
  );

  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    await dialog.accept();
  });
  await page.getByTestId("saved-song-delete").click();
  await expect(page.getByTestId("saved-song-item")).toHaveCount(0);
  await expect(page.getByText("保存された楽曲はまだありません。")).toBeVisible();
  await expect(page.getByTestId("saved-song-status")).toContainText(
    "削除しました",
  );
  await expectNoHorizontalOverflow(page);
});
