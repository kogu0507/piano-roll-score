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

async function expectPriorityPanelIsNearCanvas(
  page: Page,
  canvasSelector: string,
): Promise<void> {
  const layout = await page.evaluate((selector) => {
    const panel = document.querySelector(".practice-priority-panel");
    const canvas = document.querySelector(selector);

    if (panel === null || canvas === null) {
      return null;
    }

    const panelBounds = panel.getBoundingClientRect();
    const canvasBounds = canvas.getBoundingClientRect();

    return {
      panelBeforeCanvas: panelBounds.bottom <= canvasBounds.top,
      gap: canvasBounds.top - panelBounds.bottom,
      canvasWidth: canvasBounds.width,
      canvasHeight: canvasBounds.height,
    };
  }, canvasSelector);

  if (layout === null) {
    throw new Error("主要操作パネルまたはCanvasが見つかりません。");
  }

  expect(layout.panelBeforeCanvas).toBe(true);
  expect(layout.gap).toBeLessThanOrEqual(180);
  expect(layout.canvasWidth).toBeGreaterThan(300);
  expect(layout.canvasHeight).toBeGreaterThan(180);
}

test("縦表示は主要操作と表示調整を優先し、データ操作を補助メニューに置く", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openBuiltinLoadScreen(page);
  await getVerticalPreviewButton(page).click();

  await expect(getVerticalCanvas(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "スタート" })).toBeVisible();
  await expect(page.getByRole("button", { name: "一時停止" })).toBeVisible();
  await expect(page.getByRole("button", { name: "先頭に戻す" })).toBeVisible();
  await expect(page.getByLabel("曲の現在位置")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "横表示へ切り替え" }),
  ).toBeVisible();
  await expect(page.getByLabel("白鍵1鍵の幅")).toBeVisible();
  await expect(page.getByLabel("譜面の横位置")).toBeVisible();
  await expect(
    page.locator("#vertical-playback-controls-playback-rate"),
  ).toBeHidden();
  await expect(page.locator("details.practice-menu")).not.toHaveAttribute(
    "open",
    "",
  );

  const menu = page.locator("details.practice-menu");
  await menu.locator("summary").click();
  await expect(
    menu.getByRole("button", { name: "ロード画面へ戻る" }),
  ).toBeVisible();
  await expect(menu).toContainText("端末内保存");
  await expect(menu).toContainText("JSON書き出し");

  await expectPriorityPanelIsNearCanvas(page, ".vertical-canvas");
  await expectNoHorizontalOverflow(page);
});

test("横表示は主要操作と五線調整を優先し、補助設定を折りたたむ", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openBuiltinLoadScreen(page);
  await getHorizontalPreviewButton(page).click();

  await expect(getHorizontalCanvas(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "スタート" })).toBeVisible();
  await expect(page.getByRole("button", { name: "一時停止" })).toBeVisible();
  await expect(page.getByRole("button", { name: "先頭に戻す" })).toBeVisible();
  await expect(page.getByLabel("曲の現在位置")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "縦表示へ切り替え" }),
  ).toBeVisible();
  await expect(page.getByLabel("五線の1間の幅")).toBeVisible();
  await expect(page.getByLabel("譜面の縦位置")).toBeVisible();

  const settings = page.locator("details.playback-controls__secondary");
  await expect(settings).not.toHaveAttribute("open", "");
  await expect(
    page.locator("#horizontal-playback-controls-playback-rate"),
  ).toBeHidden();
  await settings.locator("summary").click();
  await expect(page.getByLabel("再生速度")).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "メトロノーム" }),
  ).toBeVisible();
  await expect(page.getByLabel("プリカウント")).toBeVisible();

  await expectPriorityPanelIsNearCanvas(page, ".horizontal-canvas");
  await expectNoHorizontalOverflow(page);
});
