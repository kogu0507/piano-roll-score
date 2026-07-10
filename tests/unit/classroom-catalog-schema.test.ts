import { describe, expect, it } from "vitest";

import { validateClassroomCatalog } from "../../src/schema/classroom-catalog-schema";

const validCatalog = {
  schemaVersion: 1,
  catalogType: "classroom",
  classroom: {
    displayName: "デモ教室",
    catalogName: "導入教材",
    updatedAt: "2026-07-09",
  },
  songs: [
    {
      id: "demo-001",
      title: "メリーさんの羊",
      description: "右手導入用",
      level: "導入",
      catalogGroup: "右手",
      songUrl: "./songs/001.json",
    },
  ],
};

describe("教室カタログスキーマ", () => {
  it("必要項目を持つ教室カタログを受け入れる", () => {
    const result = validateClassroomCatalog(validCatalog);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.classroom.displayName).toBe("デモ教室");
      expect(result.data.songs[0]?.songUrl).toBe("./songs/001.json");
    }
  });

  it("運用前の空カタログを受け入れる", () => {
    const result = validateClassroomCatalog({
      ...validCatalog,
      songs: [],
    });

    expect(result.success).toBe(true);
  });

  it("必須項目不足を検証エラーにする", () => {
    const { classroom: _classroom, ...catalogWithoutClassroom } = validCatalog;
    const result = validateClassroomCatalog(catalogWithoutClassroom);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "classroom" }),
        ]),
      );
    }
  });

  it("曲ID重複を検証エラーにする", () => {
    const result = validateClassroomCatalog({
      ...validCatalog,
      songs: [
        validCatalog.songs[0],
        { ...validCatalog.songs[0], title: "重複曲" },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "songs.1.id" }),
        ]),
      );
    }
  });
});
