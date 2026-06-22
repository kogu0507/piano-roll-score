import { describe, expect, it } from "vitest";

import { validateBuiltinSongIndex } from "../../src/schema/builtin-song-index-schema";

const validIndex = {
  schemaVersion: 1,
  songs: [
    {
      id: "001",
      title: "ドからソまで",
      description: "右手の導入確認",
      level: "導入",
    },
  ],
};

describe("内蔵曲一覧スキーマ", () => {
  it("正常な一覧を検証できる", () => {
    expect(validateBuiltinSongIndex(validIndex).success).toBe(true);
  });

  it("ID重複を検出する", () => {
    expect(
      validateBuiltinSongIndex({
        ...validIndex,
        songs: [validIndex.songs[0], validIndex.songs[0]],
      }).success,
    ).toBe(false);
  });
});
