import { expect, test, type Page } from "@playwright/test";

function getJsonEditor(page: Page) {
  return page.getByRole("textbox", { name: "楽曲JSON", exact: true });
}

function getPreviewButton(page: Page) {
  return page.getByRole("button", { name: "縦表示を確認" });
}

function getCanvas(page: Page) {
  return page.getByLabel(/縦表示静止プレビュー/);
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

test("縦表示画面に曲名、静止プレビュー、Canvasを表示する", async ({
  page,
}) => {
  await openBuiltinPreview(page);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "ドからソまで",
  );
  await expect(page.getByText("静止プレビュー", { exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "手の色分け" })).toBeVisible();
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
