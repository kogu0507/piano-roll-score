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
      seriesId: "frog-song",
      seriesTitle: "カエルの合唱",
      part: "right",
      variantLabel: "右手",
      sortOrder: 100,
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

  it("visibleInHome、catalogGroup、教材バリエーションを任意項目として扱える", () => {
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
          seriesId: "frog-song",
          seriesTitle: "カエルの合唱",
          part: "left",
          variantLabel: "左手 Lv.1",
          sortOrder: 101,
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
      expect(hidden.data.songs[0]?.seriesTitle).toBe("カエルの合唱");
      expect(hidden.data.songs[0]?.part).toBe("left");
      expect(hidden.data.songs[0]?.variantLabel).toBe("左手 Lv.1");
      expect(hidden.data.songs[0]?.sortOrder).toBe(101);
    }
  });

  it("教材バリエーションのpartは定義済み値だけを受け入れる", () => {
    const result = validateBuiltinSongIndex({
      ...validIndex,
      songs: [
        {
          ...validIndex.songs[0],
          part: "unknown",
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
