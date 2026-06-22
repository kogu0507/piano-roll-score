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
  return page.getByRole("textbox", { name: "楽曲JSON", exact: true });
}

test("内蔵サンプルをJSON欄へ読み込める", async ({ page }) => {
  await page.goto("./");

  await expect(
    page.getByRole("heading", { level: 2, name: "内蔵サンプル" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "ドからソまでをJSON欄に読み込む" })
    .click();

  await expect(getJsonEditor(page)).toHaveValue(/"title": "ドからソまで"/);
  await expect(page.getByText("JSONは有効です。")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("URLのIDからJSON欄と楽曲概要を表示する", async ({ page }) => {
  await page.goto("./?id=001");

  await expect(getJsonEditor(page)).toHaveValue(/"id": "001"/);
  await expect(page.getByText("JSONは有効です。")).toBeVisible();
  await expect(page.getByText("80", { exact: true })).toBeVisible();

  await page.goto("./?id=002");
  await expect(getJsonEditor(page)).toHaveValue(/"id": "002"/);
  await expect(
    page
      .getByRole("region", { name: "確認結果" })
      .getByText("ド♯とレ♭", { exact: true }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("貼り付けた有効なJSONを検証できる", async ({ page }) => {
  await page.goto("./");
  await getJsonEditor(page).fill(JSON.stringify(validSong));
  await page.getByRole("button", { name: "JSONを確認" }).click();

  await expect(page.getByText("JSONは有効です。")).toBeVisible();
  await expect(page.getByText("貼り付けテスト曲", { exact: true })).toBeVisible();
  await expect(page.getByText("3/4", { exact: true })).toBeVisible();
});

test("JSON構文エラーとスキーマエラーを表示する", async ({ page }) => {
  await page.goto("./");
  await getJsonEditor(page).fill("{");
  await page.getByRole("button", { name: "JSONを確認" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "JSONの構文を確認してください。",
  );

  await page
    .getByRole("textbox", { name: "楽曲JSON", exact: true })
    .fill(JSON.stringify({ ...validSong, bpm: 10 }));
  await page.getByRole("button", { name: "JSONを確認" }).click();
  await expect(page.getByRole("alert")).toContainText("bpm");
  await expect(page.getByRole("alert")).toContainText("20以上");
});

test("JSONファイルを読み込める", async ({ page }) => {
  await page.goto("./");
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
  await page.locator('input[type="file"]').setInputFiles({
    name: "large.json",
    mimeType: "application/json",
    buffer: Buffer.alloc(2 * 1024 * 1024 + 1, "a"),
  });

  await expect(page.getByRole("alert")).toContainText(
    "読み込めるJSONファイルは2 MiB以下です。",
  );
});

test("有効なJSONを正規化してダウンロードできる", async ({ page }) => {
  await page.goto("./");
  await page
    .getByRole("textbox", { name: "楽曲JSON", exact: true })
    .fill(JSON.stringify({ ...validSong, id: "export-test" }));

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
  await getJsonEditor(page).fill("{");

  let downloadStarted = false;
  page.on("download", () => {
    downloadStarted = true;
  });
  await page.getByRole("button", { name: "JSONを書き出す" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.waitForTimeout(200);

  expect(downloadStarted).toBe(false);
});

test("編集内容の破棄を拒否すると入力を維持する", async ({ page }) => {
  await page.goto("./");
  const editor = getJsonEditor(page);
  await editor.fill('{"edited":true}');

  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    await dialog.dismiss();
  });
  await page
    .getByRole("button", { name: "ドからソまでをJSON欄に読み込む" })
    .click();

  await expect(editor).toHaveValue('{"edited":true}');
  await expectNoHorizontalOverflow(page);
});

test("存在しないIDでも他の入力方法を利用できる", async ({ page }) => {
  await page.goto("./?id=missing");

  await expect(page.getByRole("alert")).toContainText(
    "指定された内蔵曲が見つかりません。",
  );
  await expect(getJsonEditor(page)).toBeEditable();
  await expect(
    page.getByRole("button", { name: "ドからソまでをJSON欄に読み込む" }),
  ).toBeVisible();
});
