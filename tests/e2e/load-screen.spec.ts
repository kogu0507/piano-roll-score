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

const builtinSongs = [
  ["000", "メリーさんの羊"],
  ["010", "ぶんぶんぶん"],
  ["020", "聖者の行進"],
  ["030", "喜びの歌（D major）"],
  ["040", "カエルの合唱"],
  ["041", "カエルの合唱 左手 Lv.1"],
  ["042", "カエルの合唱 左手 Lv.2"],
  ["043", "カエルの合唱 左手 Lv.3"],
  ["044", "カエルの合唱 左手 Lv.4"],
  ["045", "カエルの合唱 左手 Lv.5"],
  ["046", "カエルの合唱 左手 Lv.6"],
  ["047", "カエルの合唱 左手 Lv.7"],
  ["048", "カエルの合唱 左手 Lv.8"],
  ["049", "カエルの合唱 左手 Lv.9"],
  ["050", "きらきら星"],
  ["901", "ドからソまで"],
  ["902", "ド♯とレ♭"],
] as const;
const homeVisibleBuiltinSongs = builtinSongs.filter(([id]) =>
  ["000", "010", "020", "030", "040", "041", "050"].includes(id),
);

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
  await expect(getSongSelect(page)).toContainText("メリーさんの羊");
  await expect(getSongSelect(page).locator('option[value="builtin:041"]')).toHaveCount(1);
  await expect(getSongSelect(page).locator('option[value="builtin:042"]')).toHaveCount(0);
  await expect(getSongSelect(page).locator('option[value="builtin:049"]')).toHaveCount(0);
  await expect(getSongSelect(page).locator('option[value="builtin:901"]')).toHaveCount(0);
  await expect(getSongSelect(page).locator('option[value="builtin:902"]')).toHaveCount(0);

  await getSongSelect(page).selectOption("builtin:000");

  await expect(getJsonEditor(page)).toHaveValue(/"title": "メリーさんの羊"/);
  await expect(page.getByTestId("song-detail")).toContainText(
    "メリーさんの羊",
  );
  await expect(page.getByText("JSONは有効です。")).toBeHidden();
  await expect(getPianoButton(page)).toBeEnabled();
  await expect(getScoreButton(page)).toBeEnabled();
  await expectNoHorizontalOverflow(page);
});

test("ホームから曲カタログへ移動できる", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "曲カタログ" }).click();

  await expect(page).toHaveURL(/\/catalog\.html$/);
  await expect(page.getByRole("heading", { name: "piano-roll-score 曲一覧" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("load画面で保存曲をプルダウンから選べる", async ({ page }) => {
  await page.goto("./?id=000");
  await expect(getPianoButton(page)).toBeEnabled();
  await openDataManagement(page);
  await page.getByTestId("save-song-button").click();
  await expect(page.getByTestId("saved-song-item")).toHaveCount(1);
  await expect(getSongSelect(page).locator('option[value="saved:song-000"]')).toHaveText(
    /メリーさんの羊/,
  );

  await getJsonEditor(page).fill('{"edited":true}');
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    await dialog.accept();
  });
  await getSongSelect(page).selectOption("saved:song-000");

  await expect(getJsonEditor(page)).toHaveValue(/"id": "000"/);
  await expect(page.getByTestId("song-detail")).toContainText(
    "メリーさんの羊",
  );
  await expect(getPianoButton(page)).toBeEnabled();
  await expect(getScoreButton(page)).toBeEnabled();
  await expectNoHorizontalOverflow(page);
});

test("URLのIDから全正式内蔵曲を選択済みで表示する", async ({ page }) => {
  for (const [id, title] of builtinSongs) {
    await page.goto(`./?id=${id}`);

    await expect(getSongSelect(page)).toHaveValue(`builtin:${id}`);
    await expect(getJsonEditor(page)).toHaveValue(new RegExp(`"id": "${id}"`));
    await expect(page.getByTestId("song-detail")).toContainText(title);
    await expect(getPianoButton(page)).toBeEnabled();
    await expect(getScoreButton(page)).toBeEnabled();
  }

  await expectNoHorizontalOverflow(page);
});

test("ホーム非表示曲は通常セレクターに出ず、直接URLでは一時選択肢として読み込める", async ({
  page,
}) => {
  await page.goto("./");
  await expect(getSongSelect(page).locator('option[value="builtin:902"]')).toHaveCount(0);
  await expect(getSongSelect(page)).not.toContainText("ド♯とレ♭");

  await page.goto("./?id=902");
  await expect(getSongSelect(page)).toHaveValue("builtin:902");
  await expect(
    getSongSelect(page).locator('optgroup[label="直接指定された曲"] option[value="builtin:902"]'),
  ).toHaveText(/ド♯とレ♭/);
  await expect(page.getByTestId("song-detail")).toContainText("ド♯とレ♭");
  await expect(getPianoButton(page)).toBeEnabled();
  await expect(getScoreButton(page)).toBeEnabled();
  await expectNoHorizontalOverflow(page);
});

test("廃止した旧IDは読み込みエラーになり現行サンプルから再開できる", async ({ page }) => {
  // O-025 M04で終了したURLの検証。現行教材の参照ではない。
  for (const id of ["001", "002", "003", "004", "005", "006", "007"]) {
    await page.goto(`./?id=${id}`);
    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(getPianoButton(page)).toBeDisabled();
    await expect(getScoreButton(page)).toBeDisabled();
    await getSongSelect(page).selectOption("builtin:000");
    await expect(getJsonEditor(page)).toHaveValue(/"id": "000"/);
    await expect(getPianoButton(page)).toBeEnabled();
    await expect(getScoreButton(page)).toBeEnabled();
  }
});

test("選択した曲からピアノ表示とスコア表示へ進める", async ({ page }) => {
  await page.goto("./");
  await expect(getSongSelect(page)).toContainText("メリーさんの羊");
  await getSongSelect(page).selectOption("builtin:000");
  await getPianoButton(page).click();
  await expect(page.locator("canvas.vertical-canvas")).toBeVisible();
  await expect(page.locator("canvas.vertical-canvas")).toHaveAttribute(
    "data-current-beat",
    "0.00",
  );
  await expectNoHorizontalOverflow(page);

  await page.goto("./");
  await expect(getSongSelect(page)).toContainText("メリーさんの羊");
  await getSongSelect(page).selectOption("builtin:000");
  await getScoreButton(page).click();
  await expect(page.locator("canvas.horizontal-canvas")).toBeVisible();
  await expect(page.locator("canvas.horizontal-canvas")).toHaveAttribute(
    "data-current-beat",
    "0.00",
  );
  await expectNoHorizontalOverflow(page);
});

test("?id=000,010,020の代表曲からピアノ表示とスコア表示へ進める", async ({
  page,
}) => {
  for (const [id, title] of homeVisibleBuiltinSongs.slice(0, 3)) {
    await page.goto(`./?id=${id}`);
    await expect(page.getByTestId("song-detail")).toContainText(title);
    await getPianoButton(page).click();
    await expect(page.locator("canvas.vertical-canvas")).toBeVisible();
    await expect(page.locator("canvas.vertical-canvas")).toHaveAttribute(
      "data-measure-grid-line-count",
      /^[1-9]\d*$/,
    );
    await expectNoHorizontalOverflow(page);

    await page.goto(`./?id=${id}`);
    await expect(page.getByTestId("song-detail")).toContainText(title);
    await getScoreButton(page).click();
    await expect(page.locator("canvas.horizontal-canvas")).toBeVisible();
    await expect(page.locator("canvas.horizontal-canvas")).toHaveAttribute(
      "data-measure-grid-line-count",
      /^[1-9]\d*$/,
    );
    await expectNoHorizontalOverflow(page);
  }
});

test("アウフタクト曲 ?id=020 からピアノ表示とスコア表示へ進める", async ({
  page,
}) => {
  await page.goto("./?id=020");
  await expect(page.getByTestId("song-detail")).toContainText(
    "聖者の行進",
  );
  await getPianoButton(page).click();
  const verticalCanvas = page.locator("canvas.vertical-canvas");
  await expect(verticalCanvas).toBeVisible();
  await expect(verticalCanvas).toHaveAttribute("data-current-beat", "0.00");
  await expect(verticalCanvas).toHaveAttribute("data-end-beat", "33.50");
  await expect(verticalCanvas).toHaveAttribute(
    "data-measure-grid-line-count",
    /^[1-9]\d*$/,
  );
  await expectNoHorizontalOverflow(page);

  await page.goto("./?id=020");
  await expect(page.getByTestId("song-detail")).toContainText(
    "聖者の行進",
  );
  await getScoreButton(page).click();
  const horizontalCanvas = page.locator("canvas.horizontal-canvas");
  await expect(horizontalCanvas).toBeVisible();
  await expect(horizontalCanvas).toHaveAttribute("data-current-beat", "0.00");
  await expect(horizontalCanvas).toHaveAttribute("data-end-beat", "33.50");
  await expect(horizontalCanvas).toHaveAttribute(
    "data-measure-grid-line-count",
    /^[1-9]\d*$/,
  );
  await expectNoHorizontalOverflow(page);
});

test("左手伴奏曲 ?id=041 からピアノ表示とスコア表示へ進める", async ({
  page,
}) => {
  await page.goto("./?id=041");
  await expect(page.getByTestId("song-detail")).toContainText(
    "カエルの合唱 左手",
  );
  await expect(page.getByTestId("song-detail")).toContainText("ヘ音記号");
  await getPianoButton(page).click();
  const verticalCanvas = page.locator("canvas.vertical-canvas");
  await expect(verticalCanvas).toBeVisible();
  await expect(verticalCanvas).toHaveAttribute("data-clef", "bass");
  await expect(verticalCanvas).toHaveAttribute("data-pitch-range", "48|55");
  await expect(verticalCanvas).toHaveAttribute(
    "data-left-hand-note-count",
    "20",
  );
  await expect(verticalCanvas).toHaveAttribute("data-hand-kinds", "left");
  await expectNoHorizontalOverflow(page);

  await page.goto("./?id=041");
  await expect(page.getByTestId("song-detail")).toContainText(
    "カエルの合唱 左手",
  );
  await getScoreButton(page).click();
  const horizontalCanvas = page.locator("canvas.horizontal-canvas");
  await expect(horizontalCanvas).toBeVisible();
  await expect(horizontalCanvas).toHaveAttribute("data-clef", "bass");
  await expect(horizontalCanvas).toHaveAttribute(
    "data-staff-bottom-line",
    "G2",
  );
  await expect(horizontalCanvas).toHaveAttribute(
    "data-left-hand-note-count",
    "20",
  );
  await expect(horizontalCanvas).toHaveAttribute("data-hand-kinds", "left");
  await expect(horizontalCanvas).toHaveAttribute(
    "data-staff-diatonic-offset-range",
    "3|7",
  );
  await expect(horizontalCanvas).toHaveAttribute(
    "data-measure-grid-line-count",
    /^[1-9]\d*$/,
  );
  await expectNoHorizontalOverflow(page);
});

test("データ管理は初期状態で閉じ、開くとJSONと保存操作へ到達できる", async ({
  page,
}) => {
  await page.goto("./?id=000");
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

test("ホーム上部に教室コード入力があり、データ管理内に重複しない", async ({
  page,
}) => {
  await page.goto("./");
  const dataManagement = page.getByTestId("data-management");

  await expect(page.getByRole("heading", { name: "教室コード" })).toBeVisible();
  await expect(page.getByTestId("classroom-code-input")).toBeVisible();
  await expect(page.getByTestId("classroom-code-open")).toBeVisible();
  await expect(dataManagement.getByTestId("classroom-code-input")).toHaveCount(0);

  await openDataManagement(page);
  await expect(dataManagement.getByTestId("classroom-code-input")).toHaveCount(0);
  await expect(dataManagement.getByTestId("classroom-catalog-url")).toBeVisible();
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
  await getSongSelect(page).selectOption("builtin:000");

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
  await expect(getSongSelect(page)).toContainText("メリーさんの羊");
});

test("教室カタログを読み込み、曲カードからピアノ表示へ進める", async ({ page }) => {
  await page.goto("./");
  await openDataManagement(page);
  await page
    .getByTestId("classroom-catalog-url")
    .fill("./data/classroom-catalogs/demo/catalog.json");
  await page.getByTestId("classroom-catalog-load").click();

  await expect(page.getByTestId("classroom-catalog-status")).toContainText(
    "デモ教室",
  );
  await expect(
    page.getByTestId("classroom-catalog-song-card"),
  ).toHaveCount(4);

  const card = page.locator('[data-classroom-song-id="demo-000"]');
  await expect(card).toContainText("メリーさんの羊");
  await card.getByTestId("classroom-catalog-song-open").click();

  await expect(getJsonEditor(page)).toHaveValue(/"id": "000"/);
  await expect(getJsonEditor(page)).toHaveValue(/"title": "メリーさんの羊"/);
  await expect(getPianoButton(page)).toBeEnabled();
  await getPianoButton(page).click();
  await expect(page.locator("canvas.vertical-canvas")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("?catalog= から教室カタログを読み込み、曲カードからスコア表示へ進める", async ({
  page,
}) => {
  await page.goto("./?catalog=./data/classroom-catalogs/demo/catalog.json");

  await expect
    .poll(() =>
      page
        .getByTestId("data-management")
        .evaluate((element) => (element as HTMLDetailsElement).open),
    )
    .toBe(true);
  await expect(page.getByTestId("classroom-catalog-status")).toContainText(
    "デモ教室",
  );

  const card = page.locator('[data-classroom-song-id="demo-902"]');
  await expect(card).toContainText("ド♯とレ♭");
  await card.getByTestId("classroom-catalog-song-open").click();

  await expect(getJsonEditor(page)).toHaveValue(/"id": "902"/);
  await expect(getScoreButton(page)).toBeEnabled();
  await getScoreButton(page).click();
  await expect(page.locator("canvas.horizontal-canvas")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("壊れた教室カタログでもアプリ全体は止まらない", async ({ page }) => {
  await page.goto("./");
  await openDataManagement(page);
  await page
    .getByTestId("classroom-catalog-url")
    .fill("./data/classroom-catalogs/demo/missing.json");
  await page.getByTestId("classroom-catalog-load").click();

  await expect(page.getByTestId("classroom-catalog-status")).not.toHaveText(
    "教室カタログはまだ読み込まれていません。",
  );
  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(getSongSelect(page)).toBeVisible();
  await expect(getJsonEditor(page)).toBeEditable();
  await expectNoHorizontalOverflow(page);
});

test("スマートフォン幅でも教室カタログカードで横スクロールが出ない", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await openDataManagement(page);
  await page
    .getByTestId("classroom-catalog-url")
    .fill("./data/classroom-catalogs/demo/catalog.json");
  await page.getByTestId("classroom-catalog-load").click();

  await expect(
    page.getByTestId("classroom-catalog-song-card"),
  ).toHaveCount(4);
  await expect(
    page.locator('.classroom-catalog__group[data-catalog-group="カエルの合唱"]'),
  ).toContainText("カエルの合唱 右手");
  await expect(
    page.locator('.classroom-catalog__group[data-catalog-group="カエルの合唱"]'),
  ).toContainText("カエルの合唱 左手");
  await expect(page.locator('[data-classroom-song-id="demo-040"]')).toHaveAttribute(
    "data-part",
    "right",
  );
  await expect(page.locator('[data-classroom-song-id="demo-041"]')).toHaveAttribute(
    "data-part",
    "left",
  );
  await expectNoHorizontalOverflow(page);
});

test("教室コードdemoから教室カタログ画面を開き、曲カードからピアノ表示へ進める", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByTestId("classroom-code-input").fill(" demo ");
  await page.getByTestId("classroom-code-open").click();

  await expect(page.locator(".app-shell--classroom-focused")).toBeVisible();
  await expect(page.locator(".classroom-catalog-screen")).toBeVisible();
  await expect(page.locator(".classroom-catalog-screen")).toContainText(
    "デモ教室",
  );
  await expect(page.locator(".classroom-catalog-screen")).toContainText(
    "教室カタログ確認用",
  );
  await expect(page.getByTestId("classroom-catalog-home")).toBeVisible();
  await expect(
    page.getByTestId("classroom-catalog-song-card"),
  ).toHaveCount(4);

  const card = page.locator('[data-classroom-song-id="demo-040"]');
  await expect(card).toContainText("右手");
  await card.getByTestId("classroom-catalog-song-vertical").click();
  await expect(page.locator("canvas.vertical-canvas")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("教室カタログでカエルの合唱の右手・左手が同じシリーズとして表示される", async ({
  page,
}) => {
  await page.goto("./?classroom=demo");

  const frogGroup = page.locator(
    '.classroom-catalog__group[data-catalog-group="カエルの合唱"]',
  );
  await expect(frogGroup).toBeVisible();
  await expect(frogGroup).toContainText("カエルの合唱 右手");
  await expect(frogGroup).toContainText("カエルの合唱 左手");
  await expect(page.locator('[data-classroom-song-id="demo-040"]')).toContainText(
    "右手",
  );
  await expect(page.locator('[data-classroom-song-id="demo-041"]')).toContainText(
    "左手 Lv.1",
  );

  await page
    .locator('[data-classroom-song-id="demo-041"]')
    .getByTestId("classroom-catalog-song-horizontal")
    .click();
  await expect(page.locator("canvas.horizontal-canvas")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("?classroom=demoから初期読み込みし、曲カードからスコア表示へ進める", async ({
  page,
}) => {
  await page.goto("./?classroom=demo");

  await expect
    .poll(() =>
      page
        .getByTestId("data-management")
        .evaluate((element) => (element as HTMLDetailsElement).open),
    )
    .toBe(false);
  await expect(page.locator(".app-shell--classroom-focused")).toBeVisible();
  await expect(getSongSelect(page)).toBeHidden();
  await expect(page.getByTestId("data-management")).toBeHidden();
  await expect(page.locator(".classroom-catalog-screen")).toContainText(
    "デモ教室",
  );

  const card = page.locator('[data-classroom-song-id="demo-902"]');
  await expect(card).toBeVisible();
  await card.getByTestId("classroom-catalog-song-horizontal").click();
  await expect(page.locator("canvas.horizontal-canvas")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("教室カタログ画面からホームへ戻れる", async ({ page }) => {
  await page.goto("./?classroom=demo");

  await expect(page.locator(".classroom-catalog-screen")).toBeVisible();
  await page.getByTestId("classroom-catalog-home").click();

  await expect
    .poll(() =>
      page
        .getByTestId("data-management")
        .evaluate((element) => (element as HTMLDetailsElement).open),
    )
    .toBe(false);
  await expect(getSongSelect(page)).toBeVisible();
  await expect(page.locator(".app-shell--classroom-focused")).toHaveCount(0);
  await expect(page.locator(".classroom-catalog-screen")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test("存在しない教室コードは回復可能なエラーとして表示する", async ({
  page,
}) => {
  await page.route(
    "**/data/piano-roll-score/classroom-catalogs/**/catalog.json",
    async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: "{}",
      });
    },
  );
  await page.goto("./");
  await page.getByTestId("classroom-code-input").fill("missing-stage18");
  await page.getByTestId("classroom-code-open").click();

  await expect(page.getByTestId("classroom-catalog-status")).toContainText(
    "教室カタログが見つかりません",
  );
  await expect(page.getByRole("alert").first()).toContainText(
    "教室コードを確認してください",
  );
  await expect(getSongSelect(page)).toBeVisible();
  await openDataManagement(page);
  await expect(getJsonEditor(page)).toBeEditable();
  await expectNoHorizontalOverflow(page);
});

test("スマートフォン幅でも教室コードから開いた教室カタログで横スクロールが出ない", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await page.getByTestId("classroom-code-input").fill("demo");
  await page.getByTestId("classroom-code-open").click();

  await expect(page.locator(".classroom-catalog-screen")).toBeVisible();
  await expect(
    page.getByTestId("classroom-catalog-song-card"),
  ).toHaveCount(4);
  await expectNoHorizontalOverflow(page);
});
