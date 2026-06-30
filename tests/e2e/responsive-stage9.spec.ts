import { expect, test, type Page } from "@playwright/test";

interface ViewportCase {
  readonly name: string;
  readonly width: number;
  readonly height: number;
}

const phonePortrait: ViewportCase = {
  name: "smartphone portrait",
  width: 360,
  height: 740,
};
const phoneLandscape: ViewportCase = {
  name: "smartphone landscape",
  width: 844,
  height: 390,
};
const tabletPortrait: ViewportCase = {
  name: "tablet portrait",
  width: 768,
  height: 1024,
};
const tabletLandscape: ViewportCase = {
  name: "tablet landscape",
  width: 1024,
  height: 768,
};

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

async function useViewport(
  page: Page,
  viewport: ViewportCase,
): Promise<void> {
  await page.setViewportSize({
    width: viewport.width,
    height: viewport.height,
  });
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

async function expectMajorControlsHaveNames(page: Page): Promise<void> {
  const missingNames = await page.evaluate(() => {
    function isVisible(element: Element): boolean {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);

      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none"
      );
    }

    function getLabelText(element: Element): string {
      const id = element.getAttribute("id");
      const explicitLabel =
        id === null ? null : document.querySelector(`label[for="${id}"]`);
      const wrappingLabel = element.closest("label");

      return [
        element.getAttribute("aria-label"),
        explicitLabel?.textContent,
        wrappingLabel?.textContent,
        element.textContent,
        element.getAttribute("title"),
      ]
        .map((value) => value?.trim() ?? "")
        .find((value) => value.length > 0) ?? "";
    }

    return Array.from(
      document.querySelectorAll("button,input,select,textarea"),
    )
      .filter((element) => isVisible(element))
      .filter((element) => getLabelText(element).length === 0)
      .map((element) => {
        const htmlElement = element as HTMLElement;
        return {
          tag: element.tagName.toLowerCase(),
          id: htmlElement.id,
          className: htmlElement.className,
        };
      });
  });

  expect(missingNames).toEqual([]);
}

async function expectTouchTargets(page: Page): Promise<void> {
  const tooSmallControls = await page.evaluate(() => {
    const selector = [
      ".button",
      "input[type='range']",
      "input[type='file']",
      "input[type='checkbox']",
      "select",
    ].join(",");

    function isVisible(element: Element): boolean {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);

      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none"
      );
    }

    return Array.from(document.querySelectorAll(selector))
      .filter((element) => isVisible(element))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const htmlElement = element as HTMLElement;

        return {
          tag: element.tagName.toLowerCase(),
          id: htmlElement.id,
          className: htmlElement.className,
          text: htmlElement.textContent?.trim() ?? "",
          width: rect.width,
          height: rect.height,
        };
      })
      .filter((control) => control.height < 44 || control.width < 44);
  });

  expect(tooSmallControls).toEqual([]);
}

async function expectAccessibleAndTouchable(page: Page): Promise<void> {
  await expectMajorControlsHaveNames(page);
  await expectTouchTargets(page);
}

async function openPlaybackSettings(page: Page): Promise<void> {
  const menu = page.locator("details.practice-menu");
  const menuIsOpen = await menu.evaluate(
    (element) => (element as HTMLDetailsElement).open,
  );

  if (!menuIsOpen) {
    await menu.locator(":scope > summary").click();
  }

  const details = page.locator("details.playback-controls__secondary");
  const isOpen = await details.evaluate(
    (element) => (element as HTMLDetailsElement).open,
  );

  if (!isOpen) {
    await details.locator(":scope > summary").click();
  }
}

async function closePracticeMenu(page: Page): Promise<void> {
  const menu = page.locator("details.practice-menu");
  const isOpen = await menu.evaluate(
    (element) => (element as HTMLDetailsElement).open,
  );

  if (isOpen) {
    await menu.locator(":scope > summary").click();
  }
}

async function openLoadScreen(
  page: Page,
  viewport: ViewportCase,
): Promise<void> {
  await useViewport(page, viewport);
  await page.goto("./?id=001");
  await expect(getVerticalPreviewButton(page)).toBeEnabled();
  await expect(getHorizontalPreviewButton(page)).toBeEnabled();
}

test("ロード画面と保存一覧は代表ビューポートで横スクロールせず操作できる", async ({
  page,
}) => {
  for (const viewport of [
    phonePortrait,
    tabletPortrait,
    tabletLandscape,
  ]) {
    await openLoadScreen(page, viewport);
    await page.getByTestId("save-song-button").click();

    await expect(page.getByTestId("saved-song-item")).toHaveCount(1);
    await expect(page.getByTestId("saved-song-list")).toContainText("更新:");
    await expect(
      page.getByRole("button", { name: "JSONを書き出す" }),
    ).toBeVisible();
    await expect(page.getByTestId("saved-song-load")).toBeVisible();
    await expect(page.getByTestId("saved-song-delete")).toBeVisible();
    await expectAccessibleAndTouchable(page);
    await expectNoHorizontalOverflow(page);
  }
});

test("縦表示はスマートフォン縦横とタブレット幅で操作でき、Canvasサイズも更新される", async ({
  page,
}) => {
  await openLoadScreen(page, phonePortrait);
  await getVerticalPreviewButton(page).click();
  const canvas = getVerticalCanvas(page);
  const portraitCssWidth = await canvas.getAttribute("data-css-width");

  await page.getByLabel("白鍵1鍵の幅").fill("112");
  await expect(canvas).toHaveAttribute("data-white-key-width", "112");
  await page.getByLabel("譜面の横位置").fill("8");
  await expect(canvas).toHaveAttribute("data-horizontal-offset", "8");
  await openPlaybackSettings(page);
  await page.getByRole("checkbox", { name: "メトロノーム" }).check();
  await closePracticeMenu(page);
  await page.getByLabel("曲の現在位置").fill("0.75");
  await expect(canvas).toHaveAttribute("data-current-beat", "0.75");
  await expectAccessibleAndTouchable(page);
  await expectNoHorizontalOverflow(page);

  await useViewport(page, phoneLandscape);
  await expect
    .poll(() => canvas.getAttribute("data-css-width"))
    .not.toBe(portraitCssWidth);
  await page.getByRole("button", { name: "画面幅に合わせる" }).click();
  await expectAccessibleAndTouchable(page);
  await expectNoHorizontalOverflow(page);

  const landscapeCssWidth = await canvas.getAttribute("data-css-width");
  await useViewport(page, tabletPortrait);
  await expect
    .poll(() => canvas.getAttribute("data-css-width"))
    .not.toBe(landscapeCssWidth);
  await expectAccessibleAndTouchable(page);
  await expectNoHorizontalOverflow(page);
});

test("横表示はスマートフォン縦横とタブレット幅で操作でき、Canvasサイズも更新される", async ({
  page,
}) => {
  await openLoadScreen(page, phonePortrait);
  await getHorizontalPreviewButton(page).click();
  const canvas = getHorizontalCanvas(page);
  const portraitCssWidth = await canvas.getAttribute("data-css-width");

  await page.getByLabel("五線の1間の幅").fill("28");
  await expect(canvas).toHaveAttribute("data-staff-line-spacing", "28");
  await page.getByLabel("譜面の縦位置").fill("18");
  await expect(canvas).toHaveAttribute("data-vertical-offset", "18");
  await openPlaybackSettings(page);
  await page.getByLabel("再生速度").fill("1.2");
  await expect(canvas).toHaveAttribute("data-playback-rate", "1.2");
  await closePracticeMenu(page);
  await expectAccessibleAndTouchable(page);
  await expectNoHorizontalOverflow(page);

  await useViewport(page, phoneLandscape);
  await expect
    .poll(() => canvas.getAttribute("data-css-width"))
    .not.toBe(portraitCssWidth);
  await page.getByRole("button", { name: "画面高に合わせる" }).click();
  await expectAccessibleAndTouchable(page);
  await expectNoHorizontalOverflow(page);

  const landscapeCssWidth = await canvas.getAttribute("data-css-width");
  await useViewport(page, tabletLandscape);
  await expect
    .poll(() => canvas.getAttribute("data-css-width"))
    .not.toBe(landscapeCssWidth);
  await expectAccessibleAndTouchable(page);
  await expectNoHorizontalOverflow(page);
});
