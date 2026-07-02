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
  const expectMenuItem = async (locator: ReturnType<Page["locator"]>) => {
    await locator.scrollIntoViewIfNeeded();
    await expect(locator).toBeVisible();
  };

  await expect(
    page.locator(
      ".practice-menu__content > .practice-menu__section > .practice-menu__heading",
    ),
  ).toHaveText(["再生設定", "表示設定", "その他"]);
  await expectMenuItem(
    page.locator("#vertical-playback-controls-playback-rate-menu, #horizontal-playback-controls-playback-rate-menu"),
  );
  await expectMenuItem(page.getByRole("checkbox", { name: "メトロノーム" }));
  await expectMenuItem(page.getByLabel("メトロノーム音量"));
  await expectMenuItem(page.getByLabel("プリカウント"));
  await expectMenuItem(page.getByRole("button", { name: "表示調整モードを開く" }));
  await expectMenuItem(page.getByTestId("practice-show-note-names"));
  await expectMenuItem(page.getByTestId("practice-show-finger-numbers"));
  await expectMenuItem(page.getByText("曲情報"));
  await expectMenuItem(page.getByTestId("practice-save-song-button"));
  await expectMenuItem(page.getByTestId("practice-export-song-button"));
  await expectMenuItem(page.getByTestId("practice-saved-list-button"));
  await expectMenuItem(page.getByRole("button", { name: "ロード画面へ戻る" }));

  await expect
    .poll(() =>
      page.evaluate(() => {
        const content = document.querySelector(".practice-menu__content");

        if (content === null) {
          return false;
        }

        const bounds = content.getBoundingClientRect();
        return (
          bounds.top >= 0 &&
          bounds.left >= 0 &&
          bounds.right <= window.innerWidth &&
          bounds.bottom <= window.innerHeight
        );
      }),
    )
    .toBe(true);
}

async function getPanelLayoutMetrics(page: Page): Promise<{
  panelLeft: number;
  panelTop: number;
  panelRight: number;
  panelBottom: number;
  panelWidth: number;
  panelHeight: number;
  canvasTop: number;
  canvasWidth: number;
  canvasHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  panelToCanvasAreaRatio: number;
  backgroundAlpha: number;
}> {
  return page.evaluate(() => {
    const panel = document.querySelector(".practice-adjustment-panel");
    const canvas = document.querySelector("canvas");

    if (panel === null || canvas === null) {
      throw new Error("表示調整パネルまたはCanvasが見つかりません。");
    }

    const panelBounds = panel.getBoundingClientRect();
    const canvasBounds = canvas.getBoundingClientRect();
    const backgroundColor = window.getComputedStyle(panel).backgroundColor;
    const alphaMatch = backgroundColor.match(/rgba?\(([^)]+)\)/);
    const alpha =
      alphaMatch === null
        ? 1
        : Number(alphaMatch[1]?.split(",").map((part) => part.trim())[3] ?? 1);

    return {
      panelLeft: panelBounds.left,
      panelTop: panelBounds.top,
      panelRight: panelBounds.right,
      panelBottom: panelBounds.bottom,
      panelWidth: panelBounds.width,
      panelHeight: panelBounds.height,
      canvasTop: canvasBounds.top,
      canvasWidth: canvasBounds.width,
      canvasHeight: canvasBounds.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      panelToCanvasAreaRatio:
        (panelBounds.width * panelBounds.height) /
        Math.max(1, canvasBounds.width * canvasBounds.height),
      backgroundAlpha: alpha,
    };
  });
}

async function getVerticalKeyboardGuideMetrics(page: Page): Promise<{
  scale: number;
  whiteHeight: number;
  blackHeight: number;
  playbackGuideY: number;
  cssHeight: number;
}> {
  return getVerticalCanvas(page).evaluate((element) => {
    const canvas = element as HTMLCanvasElement;

    return {
      scale: Number(canvas.dataset.keyboardGuideHeightScale),
      whiteHeight: Number(canvas.dataset.whiteKeyGuideHeight),
      blackHeight: Number(canvas.dataset.blackKeyGuideHeight),
      playbackGuideY: Number(canvas.dataset.playbackGuideY),
      cssHeight: Number(canvas.dataset.cssHeight),
    };
  });
}

test("縦表示の通常練習モードは最小操作列、シーク、下側Canvasに分離される", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openBuiltinLoadScreen(page);
  await getVerticalPreviewButton(page).click();

  const topbar = page.locator(".practice-topbar");
  await expect(topbar.getByRole("button", { name: "スタート" })).toBeVisible();
  await expect(topbar.getByRole("button", { name: "スタート" })).toHaveText("▶");
  await expect(topbar.getByRole("button", { name: "一時停止" })).toBeVisible();
  await expect(topbar.getByRole("button", { name: "一時停止" })).toHaveText("❚❚");
  await expect(topbar.getByRole("button", { name: "先頭" })).toBeVisible();
  await expect(topbar.getByRole("button", { name: "先頭" })).toHaveText("⏮");
  await expect(page.locator("#vertical-playback-controls-playback-rate")).toBeVisible();
  await expect(page.locator("#vertical-playback-controls-playback-rate")).toHaveJSProperty(
    "tagName",
    "SELECT",
  );
  await expect(topbar.locator("details.practice-menu > summary")).toBeVisible();
  await expect(topbar.locator("details.practice-menu > summary")).toHaveText("☰");
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

test("スマートフォン幅の練習メニューはドロワー表示で背景タップから閉じられる", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openBuiltinLoadScreen(page);
  await getVerticalPreviewButton(page).click();
  await openPracticeMenu(page);

  const menu = page.locator("details.practice-menu");
  const content = page.locator(".practice-menu__content");
  const drawerMetrics = await content.evaluate((element) => {
    const bounds = element.getBoundingClientRect();

    return {
      left: bounds.left,
      right: bounds.right,
      width: bounds.width,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });

  expect(drawerMetrics.width / drawerMetrics.viewportWidth).toBeGreaterThan(0.72);
  expect(drawerMetrics.width / drawerMetrics.viewportWidth).toBeLessThan(0.86);
  expect(drawerMetrics.left).toBeGreaterThan(0);
  expect(drawerMetrics.right).toBeLessThanOrEqual(drawerMetrics.viewportWidth);

  await content.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(page.getByRole("button", { name: "メニューを閉じる" })).toBeVisible();
  await page.mouse.click(12, drawerMetrics.viewportHeight / 2);
  await expect
    .poll(() =>
      menu.evaluate((element) => (element as HTMLDetailsElement).open),
    )
    .toBe(false);
  await expectNoHorizontalOverflow(page);
});

test("縦表示の表示調整モードは開閉でき、調整値を維持する", async ({
  page,
}) => {
  await openBuiltinLoadScreen(page);
  await getVerticalPreviewButton(page).click();
  const canvas = getVerticalCanvas(page);
  const canvasBoxBefore = await canvas.boundingBox();

  await openDisplayAdjustmentMode(page);
  await expect(page.locator(".practice-adjustment-panel")).toBeVisible();
  await expect(page.locator(".practice-seek-row")).toBeVisible();
  await expect
    .poll(async () => {
      const canvasBoxAfter = await canvas.boundingBox();

      if (canvasBoxBefore === null || canvasBoxAfter === null) {
        return false;
      }

      return (
        Math.abs(canvasBoxBefore.x - canvasBoxAfter.x) <= 1 &&
        Math.abs(canvasBoxBefore.y - canvasBoxAfter.y) <= 1 &&
        Math.abs(canvasBoxBefore.width - canvasBoxAfter.width) <= 1 &&
        Math.abs(canvasBoxBefore.height - canvasBoxAfter.height) <= 1
      );
    })
    .toBe(true);
  await page.getByLabel("白鍵1鍵の幅").fill("120");
  await expect(canvas).toHaveAttribute("data-white-key-width", "120");
  await page.getByLabel("譜面の横位置").fill("10");
  await expect(canvas).toHaveAttribute("data-horizontal-offset", "10");
  await page.getByLabel("音価の幅").fill("50");
  await expect(canvas).toHaveAttribute("data-time-scale-percent", "50");

  await page.getByRole("button", { name: "表示調整を閉じる" }).click();
  await expect(page.locator(".practice-screen")).toHaveAttribute(
    "data-practice-mode",
    "practice",
  );
  await expect(page.getByLabel("白鍵1鍵の幅")).toBeHidden();
  await expect(page.getByLabel("曲の現在位置")).toBeVisible();
  await expect(canvas).toHaveAttribute("data-white-key-width", "120");
  await expect(canvas).toHaveAttribute("data-horizontal-offset", "10");
  await expect(canvas).toHaveAttribute("data-time-scale-percent", "50");
  await expectNoHorizontalOverflow(page);
});

test("スマートフォン横向きの表示調整フロートは画面上部基準で3項目を見つけやすくする", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openBuiltinLoadScreen(page);
  await getVerticalPreviewButton(page).click();
  const canvas = getVerticalCanvas(page);
  const canvasBoxBefore = await canvas.boundingBox();

  await openDisplayAdjustmentMode(page);
  const metrics = await getPanelLayoutMetrics(page);
  const cardsFitInPanel = await page.evaluate(() => {
    const panel = document.querySelector(".practice-adjustment-panel");
    const inputIds = ["white-key-width", "horizontal-offset", "vertical-time-scale"];

    if (panel === null) {
      return false;
    }

    const panelBounds = panel.getBoundingClientRect();

    return inputIds.every((id) => {
      const card = document.getElementById(id)?.closest(".vertical-control");

      if (card === null || card === undefined) {
        return false;
      }

      const bounds = card.getBoundingClientRect();
      return (
        bounds.top >= panelBounds.top - 1 &&
        bounds.bottom <= panelBounds.bottom + 1
      );
    });
  });

  expect(metrics.panelTop).toBeLessThan(metrics.canvasTop);
  expect(metrics.panelToCanvasAreaRatio).toBeLessThan(0.65);
  expect(metrics.backgroundAlpha).toBeLessThan(0.9);
  expect(cardsFitInPanel).toBe(true);
  await expect(page.getByLabel("白鍵1鍵の幅")).toBeVisible();
  await expect(page.getByLabel("譜面の横位置")).toBeVisible();
  await expect(page.getByLabel("音価の幅")).toBeVisible();
  await expect
    .poll(async () => {
      const canvasBoxAfter = await canvas.boundingBox();

      if (canvasBoxBefore === null || canvasBoxAfter === null) {
        return false;
      }

      return (
        Math.abs(canvasBoxBefore.width - canvasBoxAfter.width) <= 1 &&
        Math.abs(canvasBoxBefore.height - canvasBoxAfter.height) <= 1
      );
    })
    .toBe(true);
  await expectNoHorizontalOverflow(page);
});

test("スマートフォン横向きの縦表示だけ簡易鍵盤ガイドを薄いガイドへ圧縮する", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openBuiltinLoadScreen(page);
  await getVerticalPreviewButton(page).click();

  const canvas = getVerticalCanvas(page);
  await expect(canvas).toHaveAttribute(
    "data-keyboard-guide-height-scale",
    "0.56",
  );
  const landscapeMetrics = await getVerticalKeyboardGuideMetrics(page);

  expect(landscapeMetrics.whiteHeight).toBeGreaterThanOrEqual(72 * 0.5);
  expect(landscapeMetrics.whiteHeight).toBeLessThanOrEqual(72 * 0.6);
  expect(landscapeMetrics.blackHeight).toBeGreaterThanOrEqual(42 * 0.5);
  expect(landscapeMetrics.blackHeight).toBeLessThanOrEqual(42 * 0.6);
  expect(landscapeMetrics.playbackGuideY).toBeCloseTo(
    landscapeMetrics.cssHeight - landscapeMetrics.whiteHeight,
    1,
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () => getVerticalKeyboardGuideMetrics(page))
    .toMatchObject({
      scale: 1,
      whiteHeight: 72,
      blackHeight: 42,
    });

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect
    .poll(async () => getVerticalKeyboardGuideMetrics(page))
    .toMatchObject({
      scale: 1,
      whiteHeight: 72,
      blackHeight: 42,
    });
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
  await expect(page.locator("#horizontal-playback-controls-playback-rate")).toHaveJSProperty(
    "tagName",
    "SELECT",
  );
  await expect(page.getByRole("button", { name: "縦表示へ切り替え" })).toBeHidden();
  await expect(page.getByLabel("五線の1間の幅")).toBeHidden();
  await expect(page.getByLabel("譜面の縦位置")).toBeHidden();
  await expectNormalPracticeShell(page, ".horizontal-canvas");
  await expectMenuSections(page);

  const canvas = getHorizontalCanvas(page);
  const canvasBoxBefore = await canvas.boundingBox();
  await page.getByRole("button", { name: "表示調整モードを開く" }).click();
  await expect
    .poll(async () => {
      const canvasBoxAfter = await canvas.boundingBox();

      if (canvasBoxBefore === null || canvasBoxAfter === null) {
        return false;
      }

      return (
        Math.abs(canvasBoxBefore.x - canvasBoxAfter.x) <= 1 &&
        Math.abs(canvasBoxBefore.y - canvasBoxAfter.y) <= 1 &&
        Math.abs(canvasBoxBefore.width - canvasBoxAfter.width) <= 1 &&
        Math.abs(canvasBoxBefore.height - canvasBoxAfter.height) <= 1
      );
    })
    .toBe(true);
  await page.getByLabel("五線の1間の幅").fill("30");
  await expect(canvas).toHaveAttribute("data-staff-line-spacing", "30");
  await page.getByLabel("譜面の縦位置").fill("18");
  await expect(canvas).toHaveAttribute("data-vertical-offset", "18");
  await page.getByLabel("音価の幅").fill("150");
  await expect(canvas).toHaveAttribute("data-time-scale-percent", "150");
  await page.getByRole("button", { name: "表示調整を閉じる" }).click();
  await expect(canvas).toHaveAttribute("data-staff-line-spacing", "30");
  await expect(canvas).toHaveAttribute("data-vertical-offset", "18");
  await expect(canvas).toHaveAttribute("data-time-scale-percent", "150");
  await expectNoHorizontalOverflow(page);
});

test("PC幅とタブレット相当幅の表示調整はサイド寄せでCanvasを見ながら操作できる", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await openBuiltinLoadScreen(page);
    await getHorizontalPreviewButton(page).click();
    const canvas = getHorizontalCanvas(page);
    const canvasBoxBefore = await canvas.boundingBox();

    await openPracticeMenu(page);
    const menuMetrics = await page.locator(".practice-menu__content").evaluate(
      (element) => {
        const bounds = element.getBoundingClientRect();

        return {
          left: bounds.left,
          width: bounds.width,
          viewportWidth: window.innerWidth,
        };
      },
    );

    expect(menuMetrics.width / menuMetrics.viewportWidth).toBeLessThan(0.55);
    expect(menuMetrics.left).toBeGreaterThan(menuMetrics.viewportWidth * 0.4);
    await page.getByRole("button", { name: "表示調整モードを開く" }).click();

    const panelMetrics = await getPanelLayoutMetrics(page);
    expect(panelMetrics.panelWidth / panelMetrics.viewportWidth).toBeLessThan(0.55);
    expect(panelMetrics.panelLeft).toBeGreaterThan(
      panelMetrics.viewportWidth * 0.4,
    );
    expect(panelMetrics.panelToCanvasAreaRatio).toBeLessThan(0.55);
    expect(panelMetrics.backgroundAlpha).toBeLessThan(0.9);
    await expect(page.getByLabel("五線の1間の幅")).toBeVisible();
    await expect(page.getByLabel("譜面の縦位置")).toBeVisible();
    await expect(page.getByLabel("音価の幅")).toBeVisible();
    await page.getByLabel("音価の幅").fill("50");
    await expect(canvas).toHaveAttribute("data-time-scale-percent", "50");
    await expect(canvas).toHaveAttribute("data-playback-rate", "1");
    await expect(canvas).toHaveAttribute("data-current-beat", "0.00");
    await expect
      .poll(async () => {
        const canvasBoxAfter = await canvas.boundingBox();

        if (canvasBoxBefore === null || canvasBoxAfter === null) {
          return false;
        }

        return (
          Math.abs(canvasBoxBefore.width - canvasBoxAfter.width) <= 1 &&
          Math.abs(canvasBoxBefore.height - canvasBoxAfter.height) <= 1
        );
      })
      .toBe(true);
    await expectNoHorizontalOverflow(page);
  }
});

test("再生速度は通常練習モードとメニュー内で即時同期する", async ({
  page,
}) => {
  await openBuiltinLoadScreen(page);
  await getVerticalPreviewButton(page).click();
  const topSpeed = page.locator("#vertical-playback-controls-playback-rate");
  const menuSpeed = page.locator("#vertical-playback-controls-playback-rate-menu");
  const canvas = getVerticalCanvas(page);

  await topSpeed.selectOption("1.5");
  await expect(canvas).toHaveAttribute("data-playback-rate", "1.5");
  await openPracticeMenu(page);
  await expect(menuSpeed).toHaveValue("1.5");
  await menuSpeed.selectOption("0.75");
  await expect(topSpeed).toHaveValue("0.75");
  await expect(canvas).toHaveAttribute("data-playback-rate", "0.75");
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
