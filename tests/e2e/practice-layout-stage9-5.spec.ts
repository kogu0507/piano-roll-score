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

async function openDisplayAdjustmentMode(page: Page): Promise<void> {
  await openPracticeMenu(page);
  await page.getByRole("button", { name: "表示調整モードを開く" }).click();
  await expect(page.locator(".practice-screen")).toHaveAttribute(
    "data-practice-mode",
    "adjustment",
  );
}

async function expectNormalPracticeShell(
  page: Page,
  canvasSelector: string,
): Promise<void> {
  const structure = await page.evaluate((selector) => {
    const screen = document.querySelector(".practice-screen");
    const topbar = document.querySelector(".practice-topbar");
    const seekRow = document.querySelector(".practice-seek-row");
    const adjustmentPanel = document.querySelector(".practice-adjustment-panel");
    const canvasRegion = document.querySelector(".practice-canvas-region");
    const canvas = document.querySelector(selector);

    if (
      screen === null ||
      topbar === null ||
      seekRow === null ||
      adjustmentPanel === null ||
      canvasRegion === null ||
      canvas === null
    ) {
      return null;
    }

    const children = Array.from(screen.children);
    const topbarBounds = topbar.getBoundingClientRect();
    const seekBounds = seekRow.getBoundingClientRect();
    const canvasRegionBounds = canvasRegion.getBoundingClientRect();
    const canvasBounds = canvas.getBoundingClientRect();
    const adjustmentDisplay = window.getComputedStyle(adjustmentPanel).display;

    return {
      directChildOrder:
        children[0] === topbar &&
        children[1] === seekRow &&
        children[2] === adjustmentPanel &&
        children[3] === canvasRegion,
      mode: (screen as HTMLElement).dataset.practiceMode,
      topbarAboveSeek: topbarBounds.bottom <= seekBounds.top,
      seekAboveCanvas: seekBounds.bottom <= canvasBounds.top,
      canvasNearViewportBottom:
        Math.abs(window.innerHeight - canvasRegionBounds.bottom) <= 2,
      adjustmentHidden: adjustmentDisplay === "none",
      canvasWidth: canvasBounds.width,
      canvasHeight: canvasBounds.height,
    };
  }, canvasSelector);

  if (structure === null) {
    throw new Error("通常練習画面シェルまたはCanvasが見つかりません。");
  }

  expect(structure.directChildOrder).toBe(true);
  expect(structure.mode).toBe("practice");
  expect(structure.topbarAboveSeek).toBe(true);
  expect(structure.seekAboveCanvas).toBe(true);
  expect(structure.canvasNearViewportBottom).toBe(true);
  expect(structure.adjustmentHidden).toBe(true);
  expect(structure.canvasWidth).toBeGreaterThan(300);
  expect(structure.canvasHeight).toBeGreaterThan(160);
}

async function expectMenuSections(page: Page): Promise<void> {
  await openPracticeMenu(page);
  await expect(
    page.locator(
      ".practice-menu__content > .practice-menu__section > .practice-menu__heading",
    ),
  ).toHaveText(["再生設定", "表示設定", "その他"]);
  await expect(
    page.locator("#vertical-playback-controls-playback-rate-menu, #horizontal-playback-controls-playback-rate-menu"),
  ).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "メトロノーム" })).toBeVisible();
  await expect(page.getByLabel("メトロノーム音量")).toBeVisible();
  await expect(page.getByLabel("プリカウント")).toBeVisible();
  await expect(page.getByRole("button", { name: "表示調整モードを開く" })).toBeVisible();
  await expect(page.getByText("曲情報")).toBeVisible();
  await expect(page.getByTestId("practice-save-song-button")).toBeVisible();
  await expect(page.getByTestId("practice-export-song-button")).toBeVisible();
  await expect(page.getByTestId("practice-saved-list-button")).toBeVisible();
  await expect(page.getByRole("button", { name: "ロード画面へ戻る" })).toBeVisible();
}

test("縦表示の通常練習モードは最小操作列、シーク、下側Canvasに分離される", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openBuiltinLoadScreen(page);
  await getVerticalPreviewButton(page).click();

  const topbar = page.locator(".practice-topbar");
  await expect(topbar.getByRole("button", { name: "スタート" })).toBeVisible();
  await expect(topbar.getByRole("button", { name: "一時停止" })).toBeVisible();
  await expect(topbar.getByRole("button", { name: "先頭" })).toBeVisible();
  await expect(page.locator("#vertical-playback-controls-playback-rate")).toBeVisible();
  await expect(topbar.locator("details.practice-menu > summary")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "横表示へ切り替え" })).toBeHidden();
  await expect(page.getByLabel("曲の現在位置")).toBeVisible();
  await expect(page.getByLabel("白鍵1鍵の幅")).toBeHidden();
  await expect(page.getByLabel("譜面の横位置")).toBeHidden();
  await expect(getVerticalCanvas(page)).toBeVisible();

  await expectNormalPracticeShell(page, ".vertical-canvas");
  await expectMenuSections(page);
  await expectNoHorizontalOverflow(page);
});

test("縦表示の表示調整モードは開閉でき、調整値を維持する", async ({
  page,
}) => {
  await openBuiltinLoadScreen(page);
  await getVerticalPreviewButton(page).click();
  const canvas = getVerticalCanvas(page);

  await openDisplayAdjustmentMode(page);
  await expect(page.locator(".practice-adjustment-panel")).toBeVisible();
  await expect(page.getByLabel("曲の現在位置")).toBeHidden();
  await page.getByLabel("白鍵1鍵の幅").fill("120");
  await expect(canvas).toHaveAttribute("data-white-key-width", "120");
  await page.getByLabel("譜面の横位置").fill("10");
  await expect(canvas).toHaveAttribute("data-horizontal-offset", "10");

  await page.getByRole("button", { name: "表示調整を閉じる" }).click();
  await expect(page.locator(".practice-screen")).toHaveAttribute(
    "data-practice-mode",
    "practice",
  );
  await expect(page.getByLabel("白鍵1鍵の幅")).toBeHidden();
  await expect(page.getByLabel("曲の現在位置")).toBeVisible();
  await expect(canvas).toHaveAttribute("data-white-key-width", "120");
  await expect(canvas).toHaveAttribute("data-horizontal-offset", "10");
  await expectNoHorizontalOverflow(page);
});

test("横表示の通常練習モードと表示調整モードも同じ構造で使える", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openBuiltinLoadScreen(page);
  await getHorizontalPreviewButton(page).click();

  const topbar = page.locator(".practice-topbar");
  await expect(topbar.getByRole("button", { name: "スタート" })).toBeVisible();
  await expect(topbar.getByRole("button", { name: "先頭" })).toBeVisible();
  await expect(page.locator("#horizontal-playback-controls-playback-rate")).toBeVisible();
  await expect(page.getByRole("button", { name: "縦表示へ切り替え" })).toBeHidden();
  await expect(page.getByLabel("五線の1間の幅")).toBeHidden();
  await expect(page.getByLabel("譜面の縦位置")).toBeHidden();
  await expectNormalPracticeShell(page, ".horizontal-canvas");
  await expectMenuSections(page);

  await page.getByRole("button", { name: "表示調整モードを開く" }).click();
  const canvas = getHorizontalCanvas(page);
  await page.getByLabel("五線の1間の幅").fill("30");
  await expect(canvas).toHaveAttribute("data-staff-line-spacing", "30");
  await page.getByLabel("譜面の縦位置").fill("18");
  await expect(canvas).toHaveAttribute("data-vertical-offset", "18");
  await page.getByRole("button", { name: "表示調整を閉じる" }).click();
  await expect(canvas).toHaveAttribute("data-staff-line-spacing", "30");
  await expect(canvas).toHaveAttribute("data-vertical-offset", "18");
  await expectNoHorizontalOverflow(page);
});

test("再生速度は通常練習モードとメニュー内で即時同期する", async ({
  page,
}) => {
  await openBuiltinLoadScreen(page);
  await getVerticalPreviewButton(page).click();
  const topSpeed = page.locator("#vertical-playback-controls-playback-rate");
  const menuSpeed = page.locator("#vertical-playback-controls-playback-rate-menu");
  const canvas = getVerticalCanvas(page);

  await topSpeed.fill("1.5");
  await expect(canvas).toHaveAttribute("data-playback-rate", "1.5");
  await openPracticeMenu(page);
  await expect(menuSpeed).toHaveValue("1.5");
  await menuSpeed.fill("0.8");
  await expect(topSpeed).toHaveValue("0.8");
  await expect(canvas).toHaveAttribute("data-playback-rate", "0.8");
  await expectNoHorizontalOverflow(page);
});

test("練習メニューから表示切り替え、保存、JSON書き出し、保存一覧へ到達できる", async ({
  page,
}) => {
  await openBuiltinLoadScreen(page);
  await getVerticalPreviewButton(page).click();
  await openPracticeMenu(page);
  await page.getByRole("button", { name: "横表示へ切り替え" }).click();
  await expect(getHorizontalCanvas(page)).toBeVisible();

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
