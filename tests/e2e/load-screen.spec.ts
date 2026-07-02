import { expect, test, type Page } from "@playwright/test";

const validSong = {
  schemaVersion: 1,
  title: "貼り付けテスト曲",
  description: "E2Eテスト用",
  bpm: 90,
  timeSignature: {
    numerator: 3,
    denominator: 4,
  },
  clef: "treble",
  displayRange: {
    mode: "auto",
  },
  notes: [
    {
      id: "n1",
      pitch: 60,
      spelling: {
        step: "C",
        accidental: "natural",
        octave: 4,
      },
      time: 0,
      duration: 1,
    },
  ],
};

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );

  expect(hasHorizontalOverflow).toBe(false);
}

function getJsonEditor(page: Page) {
  return page.locator("#song-json");
}

function getSongSelect(page: Page) {
  return page.getByTestId("song-select");
}

function getPianoButton(page: Page) {
  return page.getByRole("button", { name: "ピアノ表示", exact: true });
}

function getScoreButton(page: Page) {
  return page.getByRole("button", { name: "スコア表示", exact: true });
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

test("load画面でサンプル曲をプルダウンから選べる", async ({ page }) => {
  await page.goto("./");
  await expect(getSongSelect(page)).toContainText("ドからソまで");

  await getSongSelect(page).selectOption("builtin:001");

  await expect(getJsonEditor(page)).toHaveValue(/"title": "ドからソまで"/);
  await expect(page.getByTestId("song-detail")).toContainText("ドからソまで");
  await expect(page.getByText("JSONは有効です。")).toBeHidden();
  await expect(getPianoButton(page)).toBeEnabled();
  await expect(getScoreButton(page)).toBeEnabled();
  await expectNoHorizontalOverflow(page);
});

test("load画面で保存曲をプルダウンから選べる", async ({ page }) => {
  await page.goto("./?id=001");
  await expect(getPianoButton(page)).toBeEnabled();
  await openDataManagement(page);
  await page.getByTestId("save-song-button").click();
  await expect(page.getByTestId("saved-song-item")).toHaveCount(1);
  await expect(getSongSelect(page).locator('option[value="saved:song-001"]')).toHaveText(
    /ドからソまで/,
  );

  await getJsonEditor(page).fill('{"edited":true}');
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    await dialog.accept();
  });
  await getSongSelect(page).selectOption("saved:song-001");

  await expect(getJsonEditor(page)).toHaveValue(/"id": "001"/);
  await expect(page.getByTestId("song-detail")).toContainText("ドからソまで");
  await expect(getPianoButton(page)).toBeEnabled();
  await expect(getScoreButton(page)).toBeEnabled();
  await expectNoHorizontalOverflow(page);
});

test("URLのIDから曲選択と楽曲概要を表示する", async ({ page }) => {
  await page.goto("./?id=001");

  await expect(getSongSelect(page)).toHaveValue("builtin:001");
  await expect(getJsonEditor(page)).toHaveValue(/"id": "001"/);
  await expect(page.getByTestId("song-detail")).toContainText("ドからソまで");
  await expect(
    page.getByTestId("song-detail").getByText("80", { exact: true }),
  ).toBeVisible();
  await expect(getPianoButton(page)).toBeEnabled();
  await expect(getScoreButton(page)).toBeEnabled();

  await page.goto("./?id=002");
  await expect(getSongSelect(page)).toHaveValue("builtin:002");
  await expect(getJsonEditor(page)).toHaveValue(/"id": "002"/);
  await expect(page.getByTestId("song-detail")).toContainText("ド♯とレ♭");
  await expect(getPianoButton(page)).toBeEnabled();
  await expect(getScoreButton(page)).toBeEnabled();
  await expectNoHorizontalOverflow(page);
});

test("選択した曲からピアノ表示とスコア表示へ進める", async ({ page }) => {
  await page.goto("./");
  await expect(getSongSelect(page)).toContainText("ド♯とレ♭");
  await getSongSelect(page).selectOption("builtin:002");
  await getPianoButton(page).click();
  await expect(page.locator("canvas.vertical-canvas")).toBeVisible();
  await expect(page.locator("canvas.vertical-canvas")).toHaveAttribute(
    "data-current-beat",
    "0.00",
  );
  await expectNoHorizontalOverflow(page);

  await page.goto("./");
  await expect(getSongSelect(page)).toContainText("ド♯とレ♭");
  await getSongSelect(page).selectOption("builtin:002");
  await getScoreButton(page).click();
  await expect(page.locator("canvas.horizontal-canvas")).toBeVisible();
  await expect(page.locator("canvas.horizontal-canvas")).toHaveAttribute(
    "data-current-beat",
    "0.00",
  );
  await expectNoHorizontalOverflow(page);
});

test("データ管理は初期状態で閉じ、開くとJSONと保存操作へ到達できる", async ({
  page,
}) => {
  await page.goto("./?id=001");
  const dataManagement = page.getByTestId("data-management");

  await expect
    .poll(() =>
      dataManagement.evaluate(
        (element) => (element as HTMLDetailsElement).open,
      ),
    )
    .toBe(false);
  await expect(getJsonEditor(page)).toBeHidden();

  await openDataManagement(page);
  await expect(getJsonEditor(page)).toBeVisible();
  await expect(page.locator("#json-file")).toBeVisible();
  await expect(page.getByRole("button", { name: "JSONを確認" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "JSONを書き出す" }),
  ).toBeVisible();
  await expect(page.getByTestId("save-song-button")).toBeVisible();
  await expect(page.getByRole("heading", { name: "確認結果" })).toBeVisible();
  await expect(page.getByText("JSONは有効です。")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("貼り付けた有効なJSONを検証できる", async ({ page }) => {
  await page.goto("./");
  await openDataManagement(page);
  await getJsonEditor(page).fill(JSON.stringify(validSong));
  await page.getByRole("button", { name: "JSONを確認" }).click();

  await expect(page.getByText("JSONは有効です。")).toBeVisible();
  await expect(page.getByTestId("song-detail")).toContainText(
    "貼り付けテスト曲",
  );
  await expect(page.getByTestId("song-detail").getByText("3/4", { exact: true })).toBeVisible();
});

test("JSON構文エラーとスキーマエラーを表示する", async ({ page }) => {
  await page.goto("./");
  await openDataManagement(page);
  await getJsonEditor(page).fill("{");
  await page.getByRole("button", { name: "JSONを確認" }).click();
  await expect(page.getByRole("alert").first()).toContainText(
    "JSONの構文を確認してください。",
  );

  await getJsonEditor(page).fill(JSON.stringify({ ...validSong, bpm: 10 }));
  await page.getByRole("button", { name: "JSONを確認" }).click();
  await expect(page.getByRole("alert").first()).toContainText("bpm");
  await expect(page.getByRole("alert").first()).toContainText("20以上");
});

test("JSONファイルを読み込める", async ({ page }) => {
  await page.goto("./");
  await openDataManagement(page);
  await page.locator('input[type="file"]').setInputFiles({
    name: "song.json",
    mimeType: "application/json",
    buffer: Buffer.from(`\uFEFF${JSON.stringify(validSong)}`),
  });

  await expect(getJsonEditor(page)).toHaveValue(
    /"title": "貼り付けテスト曲"/,
  );
  await expect(page.getByText("JSONは有効です。")).toBeVisible();
});

test("2 MiBを超えるJSONファイルを拒否する", async ({ page }) => {
  await page.goto("./");
  await openDataManagement(page);
  await page.locator('input[type="file"]').setInputFiles({
    name: "large.json",
    mimeType: "application/json",
    buffer: Buffer.alloc(2 * 1024 * 1024 + 1, "a"),
  });

  await expect(page.getByRole("alert").first()).toContainText(
    "読み込めるJSONファイルは2 MiB以下です。",
  );
});

test("有効なJSONを正規化してダウンロードできる", async ({ page }) => {
  await page.goto("./");
  await openDataManagement(page);
  await getJsonEditor(page).fill(JSON.stringify({ ...validSong, id: "export-test" }));

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSONを書き出す" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  const exported = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
    notes: Array<{ hand?: string }>;
  };

  expect(download.suggestedFilename()).toBe("export-test.json");
  expect(exported.notes[0]?.hand).toBe("unspecified");
});

test("不正なJSONではダウンロードを開始しない", async ({ page }) => {
  await page.goto("./");
  await openDataManagement(page);
  await getJsonEditor(page).fill("{");

  let downloadStarted = false;
  page.on("download", () => {
    downloadStarted = true;
  });
  await page.getByRole("button", { name: "JSONを書き出す" }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await page.waitForTimeout(200);

  expect(downloadStarted).toBe(false);
});

test("編集内容の破棄を拒否すると入力を維持する", async ({ page }) => {
  await page.goto("./");
  await openDataManagement(page);
  const editor = getJsonEditor(page);
  await editor.fill('{"edited":true}');

  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    await dialog.dismiss();
  });
  await getSongSelect(page).selectOption("builtin:001");

  await expect(editor).toHaveValue('{"edited":true}');
  await expect(getSongSelect(page)).toHaveValue("");
  await expectNoHorizontalOverflow(page);
});

test("存在しないIDでも他の入力方法を利用できる", async ({ page }) => {
  await page.goto("./?id=missing");

  await expect(page.getByRole("alert").first()).toContainText(
    "指定された内蔵曲が見つかりません。",
  );
  await openDataManagement(page);
  await expect(getJsonEditor(page)).toBeEditable();
  await expect(getSongSelect(page)).toContainText("ドからソまで");
});
