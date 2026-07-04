import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validateBuiltinSongIndex } from "../../src/schema/builtin-song-index-schema";
import { validateSong } from "../../src/schema/song-schema";

const songDir = path.join(process.cwd(), "public", "data", "songs");
const expectedIds = ["001", "002", "003", "004", "005", "901", "902"];

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
    });
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
      "901.json",
      "902.json",
      "index.json",
    ]);
    expect(jsonFiles.some((fileName) => fileName.startsWith("temp-"))).toBe(
      false,
    );
  });
});
