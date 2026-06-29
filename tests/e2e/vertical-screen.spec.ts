import { expect, test, type Page } from "@playwright/test";

function getJsonEditor(page: Page) {
  return page.getByRole("textbox", { name: "楽曲JSON", exact: true });
}

function getPreviewButton(page: Page) {
  return page.getByRole("button", { name: "縦表示を確認" });
}

function getCanvas(page: Page) {
  return page.locator("canvas.vertical-canvas");
}

async function openBuiltinPreview(page: Page): Promise<void> {
  await page.goto("./?id=001");
  await expect(getPreviewButton(page)).toBeEnabled();
  await getPreviewButton(page).click();
  await expect(getCanvas(page)).toBeVisible();
  await expect(getCanvas(page)).toHaveAttribute("data-white-key-width", /\d+/);
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

test("検証済み楽曲だけ縦表示へ進める", async ({ page }) => {
  await page.goto("./");
  await expect(getPreviewButton(page)).toBeDisabled();

  await page.goto("./?id=001");
  await expect(getPreviewButton(page)).toBeEnabled();

  await getJsonEditor(page).fill("{");
  await expect(getPreviewButton(page)).toBeDisabled();
  await page.getByRole("button", { name: "JSONを確認" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(getPreviewButton(page)).toBeDisabled();
});

test("縦表示画面に曲名、再生プレビュー、Canvasを表示する", async ({
  page,
}) => {
  await openBuiltinPreview(page);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "ドからソまで",
  );
  await expect(page.getByText("再生プレビュー", { exact: true })).toBeVisible();
  await expect(page.getByText("再生ガイド")).toBeVisible();
  await expect(page.getByText("判定ライン")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "手の色分け" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("縦表示で再生、一時停止、シーク、速度変更、先頭戻しができる", async ({
  page,
}) => {
  await openBuiltinPreview(page);
  const canvas = getCanvas(page);
  const seekInput = page.getByLabel("曲の現在位置");
  const speedInput = page.getByLabel("再生速度");

  await expect(canvas).toHaveAttribute("data-current-beat", "0.00");
  await expect(canvas).toHaveAttribute("data-end-beat", "5.00");

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

  await seekInput.fill("1.25");
  await expect(canvas).toHaveAttribute("data-current-beat", "1.25");

  await speedInput.fill("1.5");
  await expect(canvas).toHaveAttribute("data-playback-rate", "1.5");

  await page.getByRole("button", { name: "先頭に戻す" }).click();
  await expect(canvas).toHaveAttribute("data-current-beat", "0.00");
  await expect(canvas).toHaveAttribute("data-playback-status", "stopped");
  await expectNoHorizontalOverflow(page);
});

test("メトロノーム、音量、プリカウントを操作できる", async ({ page }) => {
  await openBuiltinPreview(page);
  const canvas = getCanvas(page);
  const playbackControls = page.locator(".playback-controls");

  await page.getByRole("checkbox", { name: "メトロノーム" }).check();
  await expect(playbackControls).toHaveAttribute(
    "data-metronome-enabled",
    "true",
  );

  await page.getByLabel("メトロノーム音量").fill("35");
  await expect(playbackControls).toHaveAttribute(
    "data-metronome-volume",
    "35",
  );

  await page.getByLabel("プリカウント").selectOption("1");
  await expect(playbackControls).toHaveAttribute(
    "data-precount-measures",
    "1",
  );
  await page.getByLabel("再生速度").fill("2");

  await page.getByRole("button", { name: "スタート" }).click();
  await expect(canvas).toHaveAttribute("data-playback-status", "precount");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-display-beat")))
    .toBeLessThan(0);
  const displayBeatDuringPrecount = Number(
    await canvas.getAttribute("data-display-beat"),
  );
  await expect(playbackControls).toHaveAttribute(
    "data-precount-remaining-beats",
    /[1-4]/,
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
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-current-beat")))
    .toBeGreaterThan(0);

  await page.getByRole("button", { name: "一時停止" }).click();
  await expect(canvas).toHaveAttribute("data-playback-status", "paused");
  await expectNoHorizontalOverflow(page);
});

test("白鍵幅、横位置、画面幅合わせ、中央配置を操作できる", async ({
  page,
}) => {
  await openBuiltinPreview(page);
  const canvas = getCanvas(page);
  const widthInput = page.getByLabel("白鍵1鍵の幅");
  const offsetInput = page.getByLabel("譜面の横位置");

  await widthInput.fill("120");
  await expect(canvas).toHaveAttribute("data-white-key-width", "120");

  const minimumOffset = await offsetInput.getAttribute("min");
  expect(minimumOffset).not.toBeNull();
  await offsetInput.fill(minimumOffset ?? "0");
  await expect(canvas).toHaveAttribute(
    "data-horizontal-offset",
    minimumOffset ?? "0",
  );

  await page.getByRole("button", { name: "中央に戻す" }).click();
  await expect
    .poll(() => canvas.getAttribute("data-horizontal-offset"))
    .not.toBe(minimumOffset);

  await page.getByRole("button", { name: "画面幅に合わせる" }).click();
  await expect
    .poll(() => canvas.getAttribute("data-white-key-width"))
    .not.toBe("120");
  await expectNoHorizontalOverflow(page);
});

test("Canvasの横ドラッグを横位置スライダーへ同期する", async ({ page }) => {
  await openBuiltinPreview(page);
  const canvas = getCanvas(page);
  const offsetInput = page.getByLabel("譜面の横位置");
  const before = await canvas.getAttribute("data-horizontal-offset");
  const box = await canvas.boundingBox();

  expect(box).not.toBeNull();
  if (box === null) {
    return;
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 36, box.y + box.height / 2 + 2);
  await page.mouse.up();

  await expect
    .poll(() => canvas.getAttribute("data-horizontal-offset"))
    .not.toBe(before);
  await expect
    .poll(
      async () =>
        (await canvas.getAttribute("data-horizontal-offset")) ===
        (await offsetInput.inputValue()),
    )
    .toBe(true);
});

test("ロード画面へ戻るとJSONと検証結果を保持する", async ({ page }) => {
  await page.goto("./?id=001");
  await expect(getPreviewButton(page)).toBeEnabled();
  const json = await getJsonEditor(page).inputValue();
  await getPreviewButton(page).click();

  await page.getByRole("button", { name: "ロード画面へ戻る" }).click();

  await expect(getJsonEditor(page)).toHaveValue(json);
  await expect(page.getByText("JSONは有効です。")).toBeVisible();
  await expect(getPreviewButton(page)).toBeEnabled();
});

test("画面サイズ変更後もCanvas内部サイズをCSSサイズとDPRへ合わせる", async ({
  page,
}) => {
  await openBuiltinPreview(page);
  const canvas = getCanvas(page);
  const initialCssWidth = await canvas.getAttribute("data-css-width");

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

test("844×390でCanvasだけを左右端まで広げて調整と回転へ追従する", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openBuiltinPreview(page);
  const canvas = getCanvas(page);
  const widthInput = page.getByLabel("白鍵1鍵の幅");
  const offsetInput = page.getByLabel("譜面の横位置");

  await expect
    .poll(() =>
      page.evaluate(() => {
        const canvasElement = document.querySelector(".vertical-canvas");
        const header = document.querySelector(".vertical-header");
        const controls = document.querySelector(".vertical-controls");

        if (
          canvasElement === null ||
          header === null ||
          controls === null
        ) {
          return null;
        }

        const canvasBounds = canvasElement.getBoundingClientRect();
        return {
          canvasReachesEdges:
            canvasBounds.left <= 1 &&
            window.innerWidth - canvasBounds.right <= 1,
          headerKeepsInset: header.getBoundingClientRect().left >= 10,
          controlsKeepInset: controls.getBoundingClientRect().left >= 10,
        };
      }),
    )
    .toEqual({
      canvasReachesEdges: true,
      headerKeepsInset: true,
      controlsKeepInset: true,
    });
  await expectNoHorizontalOverflow(page);

  await widthInput.fill("120");
  await expect(canvas).toHaveAttribute("data-white-key-width", "120");
  const minimumOffset = await offsetInput.getAttribute("min");
  expect(minimumOffset).not.toBeNull();
  await offsetInput.fill(minimumOffset ?? "0");
  await expect(canvas).toHaveAttribute(
    "data-horizontal-offset",
    minimumOffset ?? "0",
  );

  const landscapeCssWidth = await canvas.getAttribute("data-css-width");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => canvas.getAttribute("data-css-width"))
    .not.toBe(landscapeCssWidth);
  await expect
    .poll(() =>
      canvas.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          reachesEdges:
            bounds.left <= 1 && window.innerWidth - bounds.right <= 1,
        };
      }),
    )
    .toEqual({
      reachesEdges: true,
    });
  await expectNoHorizontalOverflow(page);
});
