import { expect, test, type Page } from "@playwright/test";

function getJsonEditor(page: Page) {
  return page.locator("#song-json");
}

function getHorizontalPreviewButton(page: Page) {
  return page.getByRole("button", { name: "スコア表示", exact: true });
}

function getVerticalPreviewButton(page: Page) {
  return page.getByRole("button", { name: "ピアノ表示", exact: true });
}

function getHorizontalCanvas(page: Page) {
  return page.locator("canvas.horizontal-canvas");
}

function getVerticalCanvas(page: Page) {
  return page.locator("canvas.vertical-canvas");
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

async function openPlaybackSettings(page: Page): Promise<void> {
  await openPracticeMenu(page);

  await expect(page.locator(".playback-controls__secondary")).toBeVisible();
}

async function openDisplayAdjustmentMode(page: Page): Promise<void> {
  await openPracticeMenu(page);
  await page.getByRole("button", { name: "表示調整モードを開く" }).click();
  await expect(page.locator(".practice-screen")).toHaveAttribute(
    "data-practice-mode",
    "adjustment",
  );
}

async function openPracticeMenu(page: Page): Promise<void> {
  const details = page.locator("details.practice-menu");
  const isOpen = await details.evaluate(
    (element) => (element as HTMLDetailsElement).open,
  );

  if (!isOpen) {
    await details.locator(":scope > summary").click();
  }
}

async function closePracticeMenu(page: Page): Promise<void> {
  const details = page.locator("details.practice-menu");
  const isOpen = await details.evaluate(
    (element) => (element as HTMLDetailsElement).open,
  );

  if (isOpen) {
    await details.getByRole("button", { name: "メニューを閉じる" }).click();
  }
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

async function openBuiltinHorizontalPreview(page: Page): Promise<void> {
  await page.goto("./?id=901");
  await expect(getHorizontalPreviewButton(page)).toBeEnabled();
  await getHorizontalPreviewButton(page).click();
  await expect(getHorizontalCanvas(page)).toBeVisible();
  await expect(getHorizontalCanvas(page)).toHaveAttribute("data-note-count", "5");
}

test("検証済み楽曲だけ横表示へ進める", async ({ page }) => {
  await page.goto("./");
  await expect(getHorizontalPreviewButton(page)).toBeDisabled();

  await page.goto("./?id=901");
  await expect(getHorizontalPreviewButton(page)).toBeEnabled();

  await openDataManagement(page);
  await getJsonEditor(page).fill("{");
  await expect(getHorizontalPreviewButton(page)).toBeDisabled();
  await page.getByRole("button", { name: "JSONを確認" }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(getHorizontalPreviewButton(page)).toBeDisabled();
});

test("横表示画面に通常練習モード、曲情報メニュー、Canvasを表示する", async ({ page }) => {
  await openBuiltinHorizontalPreview(page);

  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0);
  await expect(page.locator(".practice-seek-row")).toBeVisible();
  await expect(page.locator(".practice-adjustment-panel")).toBeHidden();
  await openPracticeMenu(page);
  await expect(page.getByText("曲情報")).toBeVisible();
  await expect(page.locator(".practice-menu__facts")).toContainText(
    "ドからソまで",
  );
  await expect(
    page.getByText("音符ブロックが右から左へ流れるスコア表示です。"),
  ).toBeVisible();
  await expect(page.getByRole("group", { name: "手の色分け" })).toBeVisible();
  await expect(getHorizontalCanvas(page)).toHaveAttribute(
    "data-playback-guide-x",
    /\d+/,
  );
  await expect(page.getByText("再生ガイド")).toBeVisible();
  await expect(page.getByText("判定ライン")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test("スコア表示で拍線・小節線が再生と音価の幅に追従する", async ({ page }) => {
  await openBuiltinHorizontalPreview(page);
  const canvas = getHorizontalCanvas(page);

  await expect(canvas).toHaveAttribute("data-beat-grid-line-count", /^[1-9]\d*$/);
  await expect(canvas).toHaveAttribute(
    "data-measure-grid-line-count",
    /^[1-9]\d*$/,
  );
  await expect(canvas).toHaveAttribute("data-pixels-per-beat", "96");
  const initialMeasurePosition = Number(
    await canvas.getAttribute("data-first-measure-grid-line-position"),
  );
  const initialBeatPosition = Number(
    await canvas.getAttribute("data-first-beat-grid-line-position"),
  );

  expect(initialBeatPosition - initialMeasurePosition).toBe(96);

  await page.getByRole("button", { name: "再生" }).click();
  await expect(canvas).toHaveAttribute("data-playback-status", "playing");
  await expect
    .poll(async () =>
      Number(await canvas.getAttribute("data-first-beat-grid-line-position")),
    )
    .toBeLessThan(initialBeatPosition);
  await page.getByRole("button", { name: "一時停止" }).click();
  await page.getByRole("button", { name: "最初から" }).click();

  await openDisplayAdjustmentMode(page);
  await page.getByLabel("音価の幅").fill("50");
  await expect(canvas).toHaveAttribute("data-pixels-per-beat", "48");
  const compactMeasurePosition = Number(
    await canvas.getAttribute("data-first-measure-grid-line-position"),
  );
  const compactBeatPosition = Number(
    await canvas.getAttribute("data-first-beat-grid-line-position"),
  );

  expect(Math.abs(compactBeatPosition - compactMeasurePosition)).toBe(48);
  await expectNoHorizontalOverflow(page);
});

test("横表示でスタートと一時停止ができる", async ({ page }) => {
  await openBuiltinHorizontalPreview(page);
  const canvas = getHorizontalCanvas(page);
  const speedInput = page.locator("#horizontal-playback-controls-playback-rate");

  await openPlaybackSettings(page);
  await page.getByRole("checkbox", { name: "メトロノーム" }).check();
  await closePracticeMenu(page);
  await page.getByRole("button", { name: "再生" }).click();
  await expect(canvas).toHaveAttribute("data-playback-status", "playing");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-current-beat")))
    .toBeGreaterThan(0);

  await openPlaybackSettings(page);
  await speedInput.selectOption("2");
  await expect(canvas).toHaveAttribute("data-playback-rate", "2");
  await closePracticeMenu(page);
  const beatAfterRateChange = Number(
    await canvas.getAttribute("data-current-beat"),
  );
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-current-beat")))
    .toBeGreaterThan(beatAfterRateChange + 0.2);

  await page.getByRole("button", { name: "一時停止" }).click();
  await expect(canvas).toHaveAttribute("data-playback-status", "paused");
  await expectNoHorizontalOverflow(page);
});

test("横表示でプリカウント中に助走表示が進む", async ({ page }) => {
  await openBuiltinHorizontalPreview(page);
  const canvas = getHorizontalCanvas(page);
  const playbackControls = page.locator(".playback-controls");

  await openPlaybackSettings(page);
  await page.getByLabel("プリカウント").selectOption("1");
  await page
    .locator("#horizontal-playback-controls-playback-rate-menu")
    .selectOption("2");
  await closePracticeMenu(page);
  await page.getByRole("button", { name: "再生" }).click();
  await expect(canvas).toHaveAttribute("data-playback-status", "precount");
  await expect(playbackControls).toHaveAttribute(
    "data-precount-remaining-beats",
    /[1-4]/,
  );
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-display-beat")))
    .toBeLessThan(0);
  const displayBeatDuringPrecount = Number(
    await canvas.getAttribute("data-display-beat"),
  );

  await page.waitForTimeout(250);
  await expect(canvas).toHaveAttribute("data-current-beat", "0.00");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-display-beat")))
    .toBeGreaterThan(displayBeatDuringPrecount);

  await expect
    .poll(() => canvas.getAttribute("data-playback-status"), {
      timeout: 4000,
    })
    .toBe("playing");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-display-beat")))
    .toBeGreaterThanOrEqual(0);
  await expectNoHorizontalOverflow(page);
});

test("横表示の五線間隔、縦位置、画面高合わせを操作できる", async ({
  page,
}) => {
  await openBuiltinHorizontalPreview(page);
  await openDisplayAdjustmentMode(page);
  const canvas = getHorizontalCanvas(page);
  const lineSpacingInput = page.getByLabel("五線の1間の幅");
  const verticalOffsetInput = page.getByLabel("譜面の縦位置");

  await expect(canvas).toHaveAttribute("data-staff-line-spacing", "18");

  await lineSpacingInput.fill("30");
  await expect(canvas).toHaveAttribute("data-staff-line-spacing", "30");

  await verticalOffsetInput.fill("24");
  await expect(canvas).toHaveAttribute("data-vertical-offset", "24");

  await page.getByRole("button", { name: "中央に戻す" }).click();
  await expect(canvas).toHaveAttribute("data-vertical-offset", "0");

  await lineSpacingInput.fill("12");
  await expect(canvas).toHaveAttribute("data-staff-line-spacing", "12");
  await page.getByRole("button", { name: "画面高に合わせる" }).click();
  await expect
    .poll(() => canvas.getAttribute("data-staff-line-spacing"))
    .not.toBe("12");
  await expect(canvas).toHaveAttribute("data-vertical-offset", "0");
  await expectNoHorizontalOverflow(page);
});

test("ロード画面へ戻るとJSONと検証結果を保持する", async ({ page }) => {
  await page.goto("./?id=901");
  await expect(getHorizontalPreviewButton(page)).toBeEnabled();
  const json = await getJsonEditor(page).inputValue();
  await getHorizontalPreviewButton(page).click();

  await openPracticeMenu(page);
  await page.getByRole("button", { name: "ホームへ戻る" }).click();

  await expect(getJsonEditor(page)).toHaveValue(json);
  await openDataManagement(page);
  await expect(page.getByText("JSONは有効です。")).toBeVisible();
  await expect(getVerticalPreviewButton(page)).toBeEnabled();
  await expect(getHorizontalPreviewButton(page)).toBeEnabled();
});

test("縦表示と横表示を相互に切り替えられる", async ({ page }) => {
  await openBuiltinHorizontalPreview(page);
  const seekInput = page.getByLabel("曲の現在位置");
  const playbackControls = page.locator(".playback-controls");

  await openPlaybackSettings(page);
  await page.getByRole("checkbox", { name: "メトロノーム" }).check();
  await page.getByLabel("メトロノーム音量").fill("42");
  await page.getByLabel("プリカウント").selectOption("2");
  await closePracticeMenu(page);
  await expect(playbackControls).toHaveAttribute(
    "data-metronome-enabled",
    "true",
  );
  await seekInput.fill("1.25");
  await expect(getHorizontalCanvas(page)).toHaveAttribute(
    "data-current-beat",
    "1.25",
  );

  await openPracticeMenu(page);
  await page.getByRole("button", { name: "ピアノ表示へ切り替え" }).click();
  await expect(getVerticalCanvas(page)).toBeVisible();
  await expect(getVerticalCanvas(page)).toHaveAttribute(
    "data-white-key-width",
    /\d+/,
  );
  await expect(getVerticalCanvas(page)).toHaveAttribute(
    "data-current-beat",
    "1.25",
  );
  await expect(page.locator(".playback-controls")).toHaveAttribute(
    "data-precount-measures",
    "2",
  );
  await expect(page.locator(".playback-controls")).toHaveAttribute(
    "data-metronome-volume",
    "42",
  );

  await openPracticeMenu(page);
  await page.getByRole("button", { name: "スコア表示へ切り替え" }).click();
  await expect(getHorizontalCanvas(page)).toBeVisible();
  await expect(getHorizontalCanvas(page)).toHaveAttribute(
    "data-note-count",
    "5",
  );
  await expect(getHorizontalCanvas(page)).toHaveAttribute(
    "data-current-beat",
    "1.25",
  );
  await expect(page.locator(".playback-controls")).toHaveAttribute(
    "data-metronome-enabled",
    "true",
  );
  await expectNoHorizontalOverflow(page);
});

test("スマートフォン幅とサイズ変更でCanvas内部サイズを更新し横スクロールしない", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openBuiltinHorizontalPreview(page);
  await openDisplayAdjustmentMode(page);
  const canvas = getHorizontalCanvas(page);
  const lineSpacingInput = page.getByLabel("五線の1間の幅");
  const verticalOffsetInput = page.getByLabel("譜面の縦位置");
  const initialCssWidth = await canvas.getAttribute("data-css-width");

  await lineSpacingInput.fill("24");
  await expect(canvas).toHaveAttribute("data-staff-line-spacing", "24");
  await verticalOffsetInput.fill("16");
  await expect(canvas).toHaveAttribute("data-vertical-offset", "16");
  await page.getByRole("button", { name: "表示調整を閉じる" }).click();
  await page.getByLabel("曲の現在位置").fill("0.75");
  await expect(canvas).toHaveAttribute("data-current-beat", "0.75");
  await openPlaybackSettings(page);
  await page
    .locator("#horizontal-playback-controls-playback-rate-menu")
    .selectOption("0.75");
  await expect(canvas).toHaveAttribute("data-playback-rate", "0.75");
  await closePracticeMenu(page);
  await expectNoHorizontalOverflow(page);
  await page.setViewportSize({ width: 720, height: 760 });
  await expect
    .poll(() => canvas.getAttribute("data-css-width"))
    .not.toBe(initialCssWidth);
  await openDisplayAdjustmentMode(page);

  const sizes = await canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    return {
      width: canvasElement.width,
      height: canvasElement.height,
      cssWidth: Number(canvasElement.dataset.cssWidth),
      cssHeight: Number(canvasElement.dataset.cssHeight),
      dpr: Number(canvasElement.dataset.dpr),
    };
  });

  expect(sizes.width).toBe(Math.round(sizes.cssWidth * sizes.dpr));
  expect(sizes.height).toBe(Math.round(sizes.cssHeight * sizes.dpr));
  await expectNoHorizontalOverflow(page);
});

test("score display note labels are left aligned near the note block start", async ({
  page,
}) => {
  await page.goto("./?id=001");
  await expect(getHorizontalPreviewButton(page)).toBeEnabled();
  await getHorizontalPreviewButton(page).click();
  const canvas = getHorizontalCanvas(page);

  await expect(canvas).toHaveAttribute("data-note-label-align", "left");
  await expect(canvas).toHaveAttribute("data-note-label-text", /\S/);
  await expect(canvas).toHaveAttribute("data-note-label-text", /\d/);

  const labelData = await canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;

    return {
      labelX: Number(canvasElement.dataset.noteLabelX),
      noteX: Number(canvasElement.dataset.noteLabelNoteX),
      maxWidth: Number(canvasElement.dataset.noteLabelMaxWidth),
    };
  });

  expect(labelData.labelX).toBeGreaterThan(labelData.noteX);
  expect(labelData.labelX - labelData.noteX).toBeLessThanOrEqual(6);
  expect(labelData.maxWidth).toBeGreaterThan(0);

  await page.goto("./?id=902");
  await expect(getHorizontalPreviewButton(page)).toBeEnabled();
  await getHorizontalPreviewButton(page).click();
  await expect(getHorizontalCanvas(page)).toHaveAttribute(
    "data-note-label-align",
    "left",
  );
  await expect(getHorizontalCanvas(page)).toHaveAttribute(
    "data-note-label-texts",
    /[♯♭]/,
  );
  await expectNoHorizontalOverflow(page);
});

test("score display label text follows note-name and finger toggles", async ({
  page,
}) => {
  await page.goto("./?id=001");
  await expect(getHorizontalPreviewButton(page)).toBeEnabled();
  await getHorizontalPreviewButton(page).click();
  const canvas = getHorizontalCanvas(page);

  await expect(canvas).toHaveAttribute("data-note-label-align", "left");
  await expect(canvas).toHaveAttribute("data-note-label-text", /\D+\s\d/);

  await openPracticeMenu(page);
  const noteNameToggle = page.getByTestId("practice-show-note-names");
  const fingerNumberToggle = page.getByTestId("practice-show-finger-numbers");

  await noteNameToggle.uncheck();
  await expect(canvas).toHaveAttribute("data-note-label-text", /^\d$/);
  await expect(canvas).toHaveAttribute("data-note-label-align", "left");

  await fingerNumberToggle.uncheck();
  await expect(canvas).toHaveAttribute("data-note-label-text", "");
  await expect(canvas).toHaveAttribute("data-note-label-texts", "");
  await expect(canvas).toHaveAttribute("data-note-label-align", "none");

  await noteNameToggle.check();
  await expect(canvas).toHaveAttribute("data-note-label-align", "left");
  await expect(canvas).toHaveAttribute("data-note-label-text", /^\D+$/);

  await fingerNumberToggle.check();
  await expect(canvas).toHaveAttribute("data-note-label-text", /\D+\s\d/);
  await expect(canvas).toHaveAttribute("data-note-label-align", "left");
  await expectNoHorizontalOverflow(page);
});

test("score display highlights sharp and flat notes even when labels are hidden", async ({
  page,
}) => {
  await page.goto("./?id=902");
  await expect(getHorizontalPreviewButton(page)).toBeEnabled();
  await getHorizontalPreviewButton(page).click();
  const canvas = getHorizontalCanvas(page);

  await expect(canvas).toHaveAttribute("data-accidental-accent-count", "2");
  await expect(canvas).toHaveAttribute(
    "data-accidental-accent-kinds",
    "sharp|flat",
  );
  await expect(canvas).toHaveAttribute(
    "data-accidental-accent-note-ids",
    "c-sharp-4|d-flat-4",
  );

  await openPracticeMenu(page);
  await page.getByTestId("practice-show-note-names").uncheck();
  await page.getByTestId("practice-show-finger-numbers").uncheck();

  await expect(canvas).toHaveAttribute("data-show-note-names", "false");
  await expect(canvas).toHaveAttribute("data-show-finger-numbers", "false");
  await expect(canvas).toHaveAttribute("data-note-label-align", "none");
  await expect(canvas).toHaveAttribute("data-accidental-accent-count", "2");
  await expect(canvas).toHaveAttribute(
    "data-accidental-accent-kinds",
    "sharp|flat",
  );
  await expectNoHorizontalOverflow(page);
});
