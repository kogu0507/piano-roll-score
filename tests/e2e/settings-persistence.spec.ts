import { expect, test, type Page } from "@playwright/test";

function getVerticalPreviewButton(page: Page) {
  return page.locator(".button--preview");
}

function getHorizontalPreviewButton(page: Page) {
  return page.locator(".button--horizontal-preview");
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

async function openPlaybackSettings(page: Page): Promise<void> {
  const menu = page.locator("details.practice-menu");
  const menuIsOpen = await menu.evaluate(
    (element) => (element as HTMLDetailsElement).open,
  );

  if (!menuIsOpen) {
    await menu.locator(":scope > summary").click();
  }

  await expect(page.locator(".playback-controls__secondary")).toBeVisible();
}

async function openDisplayAdjustmentMode(page: Page): Promise<void> {
  const menu = page.locator("details.practice-menu");
  const menuIsOpen = await menu.evaluate(
    (element) => (element as HTMLDetailsElement).open,
  );

  if (!menuIsOpen) {
    await menu.locator(":scope > summary").click();
  }

  await page.getByRole("button", { name: "表示調整モードを開く" }).click();
  await expect(page.locator(".practice-screen")).toHaveAttribute(
    "data-practice-mode",
    "adjustment",
  );
}

async function openBuiltinLoadScreen(page: Page): Promise<void> {
  await page.goto("./?id=000");
  await expect(getVerticalPreviewButton(page)).toBeEnabled();
  await expect(getHorizontalPreviewButton(page)).toBeEnabled();
}

test("縦表示と再生設定をlocalStorageへ保存し、次回表示時に復元する", async ({
  page,
}) => {
  await openBuiltinLoadScreen(page);
  await getVerticalPreviewButton(page).click();
  const canvas = getVerticalCanvas(page);

  await openDisplayAdjustmentMode(page);
  await page.locator("#white-key-width").fill("120");
  await expect(canvas).toHaveAttribute("data-white-key-width", "120");
  await page.locator("#horizontal-offset").fill("10");
  await expect(canvas).toHaveAttribute("data-horizontal-offset", "10");
  await page.locator("#vertical-time-scale").fill("125");
  await expect(canvas).toHaveAttribute("data-time-scale-percent", "125");
  await openPlaybackSettings(page);
  await page
    .locator("#vertical-playback-controls-playback-rate-menu")
    .selectOption("1.5");
  await expect(canvas).toHaveAttribute("data-playback-rate", "1.5");
  await page.locator("#vertical-playback-controls-metronome").check();
  await page.locator("#vertical-playback-controls-metronome-volume").fill("35");
  await page.locator("#vertical-playback-controls-precount").selectOption("2");

  await page.reload();
  await expect(getVerticalPreviewButton(page)).toBeEnabled();
  await getVerticalPreviewButton(page).click();

  await expect(getVerticalCanvas(page)).toHaveAttribute(
    "data-white-key-width",
    "120",
  );
  await expect(getVerticalCanvas(page)).toHaveAttribute(
    "data-horizontal-offset",
    "10",
  );
  await expect(getVerticalCanvas(page)).toHaveAttribute(
    "data-time-scale-percent",
    "125",
  );
  await expect(page.locator(".playback-controls")).toHaveAttribute(
    "data-playback-rate",
    "1.5",
  );
  await expect(page.locator(".playback-controls")).toHaveAttribute(
    "data-metronome-enabled",
    "true",
  );
  await expect(page.locator(".playback-controls")).toHaveAttribute(
    "data-metronome-volume",
    "35",
  );
  await expect(page.locator(".playback-controls")).toHaveAttribute(
    "data-precount-measures",
    "2",
  );
  await expectNoHorizontalOverflow(page);
});

test("音名表示と指番号表示の切替をlocalStorageへ保存し縦横表示へ反映する", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openBuiltinLoadScreen(page);
  await getVerticalPreviewButton(page).click();
  const verticalCanvas = getVerticalCanvas(page);

  await expect(verticalCanvas).toHaveAttribute("data-show-note-names", "true");
  await expect(verticalCanvas).toHaveAttribute(
    "data-show-finger-numbers",
    "true",
  );
  await openPlaybackSettings(page);
  const noteNameToggle = page.getByTestId("practice-show-note-names");
  const fingerNumberToggle = page.getByTestId("practice-show-finger-numbers");

  await expect(noteNameToggle).toBeChecked();
  await expect(fingerNumberToggle).toBeChecked();
  await noteNameToggle.uncheck();
  await expect(verticalCanvas).toHaveAttribute("data-show-note-names", "false");
  await fingerNumberToggle.uncheck();
  await expect(verticalCanvas).toHaveAttribute(
    "data-show-finger-numbers",
    "false",
  );
  await noteNameToggle.check();
  await fingerNumberToggle.check();
  await expect(verticalCanvas).toHaveAttribute("data-show-note-names", "true");
  await expect(verticalCanvas).toHaveAttribute(
    "data-show-finger-numbers",
    "true",
  );
  await noteNameToggle.uncheck();
  await fingerNumberToggle.uncheck();

  await page.reload();
  await expect(getHorizontalPreviewButton(page)).toBeEnabled();
  await getHorizontalPreviewButton(page).click();
  const horizontalCanvas = getHorizontalCanvas(page);

  await expect(horizontalCanvas).toHaveAttribute(
    "data-show-note-names",
    "false",
  );
  await expect(horizontalCanvas).toHaveAttribute(
    "data-show-finger-numbers",
    "false",
  );
  await openPlaybackSettings(page);
  await page.getByTestId("practice-show-note-names").check();
  await page.getByTestId("practice-show-finger-numbers").check();
  await expect(horizontalCanvas).toHaveAttribute("data-show-note-names", "true");
  await expect(horizontalCanvas).toHaveAttribute(
    "data-show-finger-numbers",
    "true",
  );
  await expectNoHorizontalOverflow(page);
});

test("横表示の五線間隔と譜面縦位置をlocalStorageへ保存し、次回表示時に復元する", async ({
  page,
}) => {
  await openBuiltinLoadScreen(page);
  await getHorizontalPreviewButton(page).click();
  const canvas = getHorizontalCanvas(page);

  await openDisplayAdjustmentMode(page);
  await page.locator("#horizontal-line-spacing").fill("30");
  await expect(canvas).toHaveAttribute("data-staff-line-spacing", "30");
  await page.locator("#horizontal-vertical-offset").fill("24");
  await expect(canvas).toHaveAttribute("data-vertical-offset", "24");
  await page.locator("#horizontal-time-scale").fill("75");
  await expect(canvas).toHaveAttribute("data-time-scale-percent", "75");

  await page.reload();
  await expect(getHorizontalPreviewButton(page)).toBeEnabled();
  await getHorizontalPreviewButton(page).click();

  await expect(getHorizontalCanvas(page)).toHaveAttribute(
    "data-staff-line-spacing",
    "30",
  );
  await expect(getHorizontalCanvas(page)).toHaveAttribute(
    "data-vertical-offset",
    "24",
  );
  await expect(getHorizontalCanvas(page)).toHaveAttribute(
    "data-time-scale-percent",
    "75",
  );
  await expectNoHorizontalOverflow(page);
});
