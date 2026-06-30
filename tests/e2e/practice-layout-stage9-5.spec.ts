import { expect, test, type Page } from "@playwright/test";

function getVerticalPreviewButton(page: Page) {
  return page.getByRole("button", { name: "縦表示を確認" });
}

function getHorizontalPreviewButton(page: Page) {
  return page.getByRole("button", { name: "横表示を確認" });
}

function getVerticalCanvas(page: Page) {
  return page.locator("canvas.vertical-canvas");
}

function getHorizontalCanvas(page: Page) {
  return page.locator("canvas.horizontal-canvas");
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

async function openBuiltinLoadScreen(page: Page): Promise<void> {
  await page.goto("./?id=001");
  await expect(getVerticalPreviewButton(page)).toBeEnabled();
  await expect(getHorizontalPreviewButton(page)).toBeEnabled();
}

async function openPracticeMenu(page: Page): Promise<void> {
  const menu = page.locator("details.practice-menu");
  const isOpen = await menu.evaluate(
    (element) => (element as HTMLDetailsElement).open,
  );

  if (!isOpen) {
    await menu.locator(":scope > summary").click();
  }
}

async function openPlaybackSettings(page: Page): Promise<void> {
  await openPracticeMenu(page);
  const settings = page.locator("details.playback-controls__secondary");
  const isOpen = await settings.evaluate(
    (element) => (element as HTMLDetailsElement).open,
  );

  if (!isOpen) {
    await settings.locator(":scope > summary").click();
  }
}

async function expectPracticeShell(
  page: Page,
  canvasSelector: string,
): Promise<void> {
  const structure = await page.evaluate((selector) => {
    const screen = document.querySelector(".practice-screen");
    const topbar = document.querySelector(".practice-topbar");
    const canvasRegion = document.querySelector(".practice-canvas-region");
    const bottomBar = document.querySelector(".practice-bottom-bar");
    const canvas = document.querySelector(selector);

    if (
      screen === null ||
      topbar === null ||
      canvasRegion === null ||
      bottomBar === null ||
      canvas === null
    ) {
      return null;
    }

    const children = Array.from(screen.children);
    const topbarBounds = topbar.getBoundingClientRect();
    const canvasBounds = canvas.getBoundingClientRect();
    const bottomBounds = bottomBar.getBoundingClientRect();

    return {
      directChildOrder:
        children[0] === topbar &&
        children[1] === canvasRegion &&
        children[2] === bottomBar,
      topbarAboveCanvas: topbarBounds.bottom <= canvasBounds.top,
      canvasAboveBottomBar: canvasBounds.bottom <= bottomBounds.top,
      bottomBarNearViewportBottom:
        Math.abs(window.innerHeight - bottomBounds.bottom) <= 2,
      canvasArea: canvasBounds.width * canvasBounds.height,
      canvasWidth: canvasBounds.width,
      canvasHeight: canvasBounds.height,
    };
  }, canvasSelector);

  if (structure === null) {
    throw new Error("練習画面シェルまたはCanvasが見つかりません。");
  }

  expect(structure.directChildOrder).toBe(true);
  expect(structure.topbarAboveCanvas).toBe(true);
  expect(structure.canvasAboveBottomBar).toBe(true);
  expect(structure.bottomBarNearViewportBottom).toBe(true);
  expect(structure.canvasWidth).toBeGreaterThan(300);
  expect(structure.canvasHeight).toBeGreaterThan(120);
  expect(structure.canvasArea).toBeGreaterThan(50000);
}

test("縦表示は上部・中央Canvas・下部バー・メニューの固定構造になる", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openBuiltinLoadScreen(page);
  await getVerticalPreviewButton(page).click();

  await expect(page.locator(".practice-topbar")).toContainText("ドからソまで");
  await expect(
    page.locator(".practice-topbar").getByRole("button", {
      name: "横表示へ切り替え",
    }),
  ).toBeVisible();
  await expect(
    page.locator(".practice-topbar details.practice-menu > summary"),
  ).toBeVisible();
  await expect(getVerticalCanvas(page)).toBeVisible();

  const bottomBar = page.locator(".practice-bottom-bar");
  await expect(bottomBar.getByRole("button", { name: "スタート" })).toBeVisible();
  await expect(bottomBar.getByRole("button", { name: "一時停止" })).toBeVisible();
  await expect(bottomBar.getByRole("button", { name: "先頭に戻す" })).toBeVisible();
  await expect(bottomBar.getByLabel("曲の現在位置")).toBeVisible();
  await expect(bottomBar.getByLabel("白鍵1鍵の幅")).toBeVisible();
  await expect(bottomBar.getByLabel("譜面の横位置")).toBeVisible();
  await expect(
    page.locator("#vertical-playback-controls-playback-rate"),
  ).toBeHidden();

  await openPracticeMenu(page);
  await expect(page.getByLabel("再生速度")).toBeHidden();
  await openPlaybackSettings(page);
  await expect(page.getByLabel("再生速度")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "メトロノーム" })).toBeVisible();
  await expect(page.getByLabel("プリカウント")).toBeVisible();
  await expect(page.getByTestId("practice-save-song-button")).toBeVisible();
  await expect(page.getByTestId("practice-export-song-button")).toBeVisible();
  await expect(page.getByRole("button", { name: "ロード画面へ戻る" })).toBeVisible();

  await expectPracticeShell(page, ".vertical-canvas");
  await expectNoHorizontalOverflow(page);
});

test("横表示は上部・中央Canvas・下部バー・メニューの固定構造になる", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openBuiltinLoadScreen(page);
  await getHorizontalPreviewButton(page).click();

  await expect(page.locator(".practice-topbar")).toContainText("ドからソまで");
  await expect(
    page.locator(".practice-topbar").getByRole("button", {
      name: "縦表示へ切り替え",
    }),
  ).toBeVisible();
  await expect(getHorizontalCanvas(page)).toBeVisible();

  const bottomBar = page.locator(".practice-bottom-bar");
  await expect(bottomBar.getByRole("button", { name: "スタート" })).toBeVisible();
  await expect(bottomBar.getByRole("button", { name: "一時停止" })).toBeVisible();
  await expect(bottomBar.getByRole("button", { name: "先頭に戻す" })).toBeVisible();
  await expect(bottomBar.getByLabel("曲の現在位置")).toBeVisible();
  await expect(bottomBar.getByLabel("五線の1間の幅")).toBeVisible();
  await expect(bottomBar.getByLabel("譜面の縦位置")).toBeVisible();
  await expect(
    page.locator("#horizontal-playback-controls-playback-rate"),
  ).toBeHidden();

  await openPlaybackSettings(page);
  await expect(page.getByLabel("再生速度")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "メトロノーム" })).toBeVisible();
  await expect(page.getByLabel("メトロノーム音量")).toBeVisible();
  await expect(page.getByLabel("プリカウント")).toBeVisible();
  await expect(page.getByTestId("practice-save-song-button")).toBeVisible();
  await expect(page.getByTestId("practice-export-song-button")).toBeVisible();

  await expectPracticeShell(page, ".horizontal-canvas");
  await expectNoHorizontalOverflow(page);
});

test("練習メニューから保存、JSON書き出し、保存一覧へ到達できる", async ({
  page,
}) => {
  await openBuiltinLoadScreen(page);
  await getVerticalPreviewButton(page).click();
  await openPracticeMenu(page);

  await page.getByTestId("practice-save-song-button").click();
  await expect(page.locator(".practice-menu__status")).toContainText(
    "保存しました",
  );

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("practice-export-song-button").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("001.json");

  await page.getByTestId("practice-saved-list-button").click();
  await expect(page.getByTestId("saved-song-item")).toHaveCount(1);
  await expect(page.getByTestId("saved-song-list")).toContainText("ドからソまで");
  await expectNoHorizontalOverflow(page);
});
