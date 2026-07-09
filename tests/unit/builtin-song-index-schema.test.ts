import { describe, expect, it } from "vitest";

import {
  isBuiltinSongVisibleInHome,
  validateBuiltinSongIndex,
} from "../../src/schema/builtin-song-index-schema";

const validIndex = {
  schemaVersion: 1,
  songs: [
    {
      id: "001",
      title: "ドからソまで",
      description: "右手の導入確認",
      level: "導入",
      visibleInHome: true,
      catalogGroup: "サンプル曲",
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

  it("visibleInHomeとcatalogGroupを任意項目として扱える", () => {
    const omitted = validateBuiltinSongIndex({
      ...validIndex,
      songs: [
        {
          id: "001",
          title: "省略時",
          description: "visibleInHome省略",
          level: "標準",
        },
      ],
    });
    const hidden = validateBuiltinSongIndex({
      ...validIndex,
      songs: [
        {
          id: "902",
          title: "検証曲",
          description: "ホーム非表示",
          level: "検証",
          visibleInHome: false,
          catalogGroup: "開発確認",
        },
      ],
    });

    expect(omitted.success).toBe(true);
    expect(hidden.success).toBe(true);

    if (omitted.success) {
      expect(isBuiltinSongVisibleInHome(omitted.data.songs[0])).toBe(true);
    }

    if (hidden.success) {
      expect(isBuiltinSongVisibleInHome(hidden.data.songs[0])).toBe(false);
    }
  });
});
