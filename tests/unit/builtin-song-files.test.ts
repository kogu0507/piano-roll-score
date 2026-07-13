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
  "001",
  "002",
  "003",
  "004",
  "005",
  "006",
  "007",
  "901",
  "902",
];
const expectedHomeVisibleIds = [
  "001",
  "002",
  "003",
  "004",
  "005",
  "006",
  "007",
];
const expectedHomeVisibleIdSet = new Set<string>(expectedHomeVisibleIds);
const expectedCatalogGroupById = new Map<string, string>([
  ["001", "サンプル曲"],
  ["002", "サンプル曲"],
  ["003", "サンプル曲"],
  ["004", "サンプル曲"],
  ["005", "サンプル曲"],
  ["006", "サンプル曲"],
  ["007", "左手教材"],
  ["901", "開発確認"],
  ["902", "開発確認"],
]);
const expectedFrogSongVariants = new Map<
  string,
  { readonly part: string; readonly variantLabel: string; readonly sortOrder: number }
>([
  ["002", { part: "right", variantLabel: "右手", sortOrder: 100 }],
  ["007", { part: "left", variantLabel: "左手 Lv.1", sortOrder: 101 }],
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

  it("007は左手単独・低音部の導入サンプルとして検証できる", () => {
    const result = validateSong(readJson("007.json"));

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.id).toBe("007");
    expect(result.data.clef).toBe("bass");
    expect(result.data.displayRange).toEqual({
      mode: "fixed",
      minPitch: 48,
      maxPitch: 57,
    });
    expect(result.data.notes).toHaveLength(29);
    expect(result.data.notes.every((note) => note.hand === "left")).toBe(true);
    expect(Math.min(...result.data.notes.map((note) => note.pitch))).toBe(48);
    expect(Math.max(...result.data.notes.map((note) => note.pitch))).toBe(57);
  });

  it("公開対象の曲ディレクトリに一時JSONや未登録JSONを残さない", () => {
    const jsonFiles = readdirSync(songDir)
      .filter((fileName) => fileName.endsWith(".json"))
      .sort();

    expect(jsonFiles).toEqual([
      "001.json",
      "002.json",
      "003.json",
      "004.json",
      "005.json",
      "006.json",
      "007.json",
      "901.json",
      "902.json",
      "index.json",
    ]);
    expect(jsonFiles.some((fileName) => fileName.startsWith("temp-"))).toBe(
      false,
    );
  });
});
