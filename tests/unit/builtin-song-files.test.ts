import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  isBuiltinSongVisibleInHome,
  validateBuiltinSongIndex,
} from "../../src/schema/builtin-song-index-schema";
import { validateSong } from "../../src/schema/song-schema";

const songDir = path.join(process.cwd(), "public", "data", "songs");
const expectedIds = [
  "000",
  "010",
  "020",
  "030",
  "040",
  "041",
  "042",
  "043",
  "044",
  "045",
  "046",
  "047",
  "048",
  "049",
  "050",
  "901",
  "902",
];
const expectedHomeVisibleIds = ["000", "010", "020", "030", "040", "041", "050"];
const expectedHomeVisibleIdSet = new Set<string>(expectedHomeVisibleIds);
const expectedCatalogGroupById = new Map<string, string>([
  ["000", "ポジション移動なし"],
  ["010", "ポジション移動なし"],
  ["020", "ポジション移動なし"],
  ["030", "ポジション移動なし"],
  ["040", "ポジション移動あり"],
  ["041", "ポジション移動あり"],
  ["042", "ポジション移動あり"],
  ["043", "ポジション移動あり"],
  ["044", "ポジション移動あり"],
  ["045", "ポジション移動あり"],
  ["046", "ポジション移動あり"],
  ["047", "ポジション移動あり"],
  ["048", "ポジション移動あり"],
  ["049", "ポジション移動あり"],
  ["050", "ポジション移動あり"],
  ["901", "開発確認"],
  ["902", "開発確認"],
]);
const expectedFrogSongVariants = new Map<
  string,
  { readonly part: string; readonly variantLabel: string; readonly sortOrder: number }
>([
  ["040", { part: "right", variantLabel: "右手", sortOrder: 400 }],
  ...Array.from({ length: 9 }, (_, index) => {
    const level = index + 1;
    const id = String(40 + level).padStart(3, "0");
    return [
      id,
      {
        part: "left",
        variantLabel: `左手 Lv.${level}`,
        sortOrder: 400 + level,
      },
    ] as const;
  }),
]);

function readJson(fileName: string): unknown {
  return JSON.parse(readFileSync(path.join(songDir, fileName), "utf8"));
}

describe("内蔵曲ファイル", () => {
  it("index.jsonのIDと正式曲JSONのIDが一致し、全曲が検証に通る", () => {
    const index = readJson("index.json");
    const indexResult = validateBuiltinSongIndex(index);

    expect(indexResult.success).toBe(true);
    if (!indexResult.success) {
      return;
    }

    expect(indexResult.data.songs.map((song) => song.id)).toEqual(expectedIds);
    expect(
      indexResult.data.songs
        .filter(isBuiltinSongVisibleInHome)
        .map((song) => song.id),
    ).toEqual(expectedHomeVisibleIds);

    indexResult.data.songs.forEach((summary) => {
      const fileName = `${summary.id}.json`;

      expect(existsSync(path.join(songDir, fileName))).toBe(true);
      const songResult = validateSong(readJson(fileName));

      expect(songResult.success).toBe(true);
      if (!songResult.success) {
        return;
      }

      expect(songResult.data.id).toBe(summary.id);
      expect(songResult.data.title).toBe(summary.title);

      if (expectedHomeVisibleIdSet.has(summary.id)) {
        expect(summary.visibleInHome).toBe(true);
      } else {
        expect(summary.visibleInHome).toBe(false);
      }
      expect(summary.catalogGroup).toBe(
        expectedCatalogGroupById.get(summary.id),
      );

      const expectedVariant = expectedFrogSongVariants.get(summary.id);
      if (expectedVariant !== undefined) {
        expect(summary.seriesId).toBe("frog-song");
        expect(summary.seriesTitle).toBe("カエルの合唱");
        expect(summary.part).toBe(expectedVariant.part);
        expect(summary.variantLabel).toBe(expectedVariant.variantLabel);
        expect(summary.sortOrder).toBe(expectedVariant.sortOrder);
      }
    });
  });

  it("041はC3とG3を使う左手伴奏Lv.1として検証できる", () => {
    const result = validateSong(readJson("041.json"));

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.id).toBe("041");
    expect(result.data.clef).toBe("bass");
    expect(result.data.displayRange).toEqual({
      mode: "fixed",
      minPitch: 48,
      maxPitch: 55,
    });
    expect(result.data.notes).toHaveLength(20);
    expect(result.data.notes.every((note) => note.hand === "left")).toBe(true);
    expect(Math.min(...result.data.notes.map((note) => note.pitch))).toBe(48);
    expect(Math.max(...result.data.notes.map((note) => note.pitch))).toBe(55);
    expect(result.data.notes.slice(0, 2)).toEqual([
      expect.objectContaining({ pitch: 48, finger: 5, time: 0, duration: 4 }),
      expect.objectContaining({ pitch: 55, finger: 1, time: 0, duration: 4 }),
    ]);
  });

  it.each(["041", "042", "043", "044", "045", "046", "047", "048", "049"])(
    "%sの全音符はC3〜G3の左手運指5・4・3・2・1に一致する",
    (id) => {
      const result = validateSong(readJson(`${id}.json`));
      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      const expectedFingers = new Map([
        [48, 5], // C3: 小指
        [50, 4], // D3: 薬指
        [52, 3], // E3: 中指
        [53, 2], // F3: 人差し指
        [55, 1], // G3: 親指
      ]);
      for (const note of result.data.notes) {
        expect(note.hand, `${id}/${note.id}`).toBe("left");
        expect(expectedFingers.has(note.pitch), `${id}/${note.id}`).toBe(true);
        expect(note.finger, `${id}/${note.id}`).toBe(expectedFingers.get(note.pitch));
      }
    },
  );

  it.each(["041", "042", "043", "044", "045", "046", "047", "048", "049"])(
    "%sは全音符がtime: 0以上かつ32拍以内の左手伴奏である",
    (id) => {
      const result = validateSong(readJson(`${id}.json`));

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.data.clef).toBe("bass");
      expect(result.data.notes.every((note) => note.hand === "left")).toBe(true);
      expect(result.data.notes.every((note) => note.finger !== undefined)).toBe(true);
      expect(Math.min(...result.data.notes.map((note) => note.time))).toBeGreaterThanOrEqual(0);
      expect(
        Math.max(...result.data.notes.map((note) => note.time + note.duration)),
      ).toBeLessThanOrEqual(32);

      const expectedRangeById = new Map<string, readonly [number, number]>([
        ["041", [48, 55]],
        ["042", [48, 55]],
        ["043", [48, 55]],
        ["044", [48, 55]],
        ["045", [48, 55]],
        ["046", [48, 55]],
        ["047", [48, 55]],
        ["048", [48, 55]],
        ["049", [48, 55]],
      ]);
      const expectedRange = expectedRangeById.get(id);

      expect(expectedRange).toBeDefined();
      expect(result.data.displayRange).toEqual({
        mode: "fixed",
        minPitch: expectedRange?.[0],
        maxPitch: expectedRange?.[1],
      });
    },
  );

  it("公開対象の曲ディレクトリに一時JSONや未登録JSONを残さない", () => {
    const jsonFiles = readdirSync(songDir)
      .filter((fileName) => fileName.endsWith(".json"))
      .sort();

    expect(jsonFiles).toEqual([
      "000.json",
      "010.json",
      "020.json",
      "030.json",
      "040.json",
      "041.json",
      "042.json",
      "043.json",
      "044.json",
      "045.json",
      "046.json",
      "047.json",
      "048.json",
      "049.json",
      "050.json",
      "901.json",
      "902.json",
      "index.json",
    ]);
    expect(jsonFiles.some((fileName) => fileName.startsWith("temp-"))).toBe(
      false,
    );
  });
});
