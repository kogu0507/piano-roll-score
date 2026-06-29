import { expect, test, type Page } from "@playwright/test";

function getJsonEditor(page: Page) {
  return page.getByRole("textbox", { name: "楽曲JSON", exact: true });
}

function getHorizontalPreviewButton(page: Page) {
  return page.getByRole("button", { name: "横表示を確認" });
}

function getVerticalPreviewButton(page: Page) {
  return page.getByRole("button", { name: "縦表示を確認" });
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

async function openBuiltinHorizontalPreview(page: Page): Promise<void> {
  await page.goto("./?id=001");
  await expect(getHorizontalPreviewButton(page)).toBeEnabled();
  await getHorizontalPreviewButton(page).click();
  await expect(getHorizontalCanvas(page)).toBeVisible();
  await expect(getHorizontalCanvas(page)).toHaveAttribute("data-note-count", "5");
}

test("検証済み楽曲だけ横表示へ進める", async ({ page }) => {
  await page.goto("./");
  await expect(getHorizontalPreviewButton(page)).toBeDisabled();

  await page.goto("./?id=001");
  await expect(getHorizontalPreviewButton(page)).toBeEnabled();

  await getJsonEditor(page).fill("{");
  await expect(getHorizontalPreviewButton(page)).toBeDisabled();
  await page.getByRole("button", { name: "JSONを確認" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(getHorizontalPreviewButton(page)).toBeDisabled();
});

test("横表示画面に曲名、説明、Canvasを表示する", async ({ page }) => {
  await openBuiltinHorizontalPreview(page);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "ドからソまで",
  );
  await expect(
    page.getByText("音符ブロックが右から左へ流れる横表示です。"),
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

test("横表示でスタートと一時停止ができる", async ({ page }) => {
  await openBuiltinHorizontalPreview(page);
  const canvas = getHorizontalCanvas(page);
  const speedInput = page.getByLabel("再生速度");

  await page.getByRole("checkbox", { name: "メトロノーム" }).check();
  await page.getByRole("button", { name: "スタート" }).click();
  await expect(canvas).toHaveAttribute("data-playback-status", "playing");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-current-beat")))
    .toBeGreaterThan(0);

  await speedInput.fill("2");
  await expect(canvas).toHaveAttribute("data-playback-rate", "2.0");
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

  await page.getByLabel("プリカウント").selectOption("1");
  await page.getByLabel("再生速度").fill("2");
  await page.getByRole("button", { name: "スタート" }).click();
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
  await page.goto("./?id=001");
  await expect(getHorizontalPreviewButton(page)).toBeEnabled();
  const json = await getJsonEditor(page).inputValue();
  await getHorizontalPreviewButton(page).click();

  await page.getByRole("button", { name: "ロード画面へ戻る" }).click();

  await expect(getJsonEditor(page)).toHaveValue(json);
  await expect(page.getByText("JSONは有効です。")).toBeVisible();
  await expect(getVerticalPreviewButton(page)).toBeEnabled();
  await expect(getHorizontalPreviewButton(page)).toBeEnabled();
});

test("縦表示と横表示を相互に切り替えられる", async ({ page }) => {
  await openBuiltinHorizontalPreview(page);
  const seekInput = page.getByLabel("曲の現在位置");
  const playbackControls = page.locator(".playback-controls");

  await page.getByRole("checkbox", { name: "メトロノーム" }).check();
  await page.getByLabel("メトロノーム音量").fill("42");
  await page.getByLabel("プリカウント").selectOption("2");
  await expect(playbackControls).toHaveAttribute(
    "data-metronome-enabled",
    "true",
  );
  await seekInput.fill("1.25");
  await expect(getHorizontalCanvas(page)).toHaveAttribute(
    "data-current-beat",
    "1.25",
  );

  await page.getByRole("button", { name: "縦表示へ切り替え" }).click();
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

  await page.getByRole("button", { name: "横表示へ切り替え" }).click();
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
  const canvas = getHorizontalCanvas(page);
  const lineSpacingInput = page.getByLabel("五線の1間の幅");
  const verticalOffsetInput = page.getByLabel("譜面の縦位置");
  const initialCssWidth = await canvas.getAttribute("data-css-width");

  await lineSpacingInput.fill("24");
  await expect(canvas).toHaveAttribute("data-staff-line-spacing", "24");
  await verticalOffsetInput.fill("16");
  await expect(canvas).toHaveAttribute("data-vertical-offset", "16");
  await page.getByLabel("曲の現在位置").fill("0.75");
  await expect(canvas).toHaveAttribute("data-current-beat", "0.75");
  await page.getByLabel("再生速度").fill("0.8");
  await expect(canvas).toHaveAttribute("data-playback-rate", "0.8");
  await expectNoHorizontalOverflow(page);
  await page.setViewportSize({ width: 720, height: 760 });
  await expect
    .poll(() => canvas.getAttribute("data-css-width"))
    .not.toBe(initialCssWidth);

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
