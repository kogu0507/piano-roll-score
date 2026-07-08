import { describe, expect, it } from "vitest";

import { validateSong } from "../../src/schema/song-schema";

function createValidSong(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: "test-song",
    title: "テスト曲",
    bpm: 80,
    timeSignature: {
      numerator: 4,
      denominator: 4,
    },
    clef: "treble",
    displayRange: {
      mode: "fixed",
      minPitch: 60,
      maxPitch: 64,
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
      {
        id: "n2",
        pitch: 64,
        spelling: {
          step: "E",
          accidental: "natural",
          octave: 4,
        },
        hand: "right",
        finger: 3,
        time: 1,
        duration: 1,
      },
    ],
  };
}

function expectInvalid(input: unknown): void {
  expect(validateSong(input).success).toBe(false);
}

describe("楽曲スキーマ", () => {
  it("正常な楽曲を検証し、省略したhandを補う", () => {
    const result = validateSong(createValidSong());

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.notes[0]?.hand).toBe("unspecified");
    }
  });

  it("必須項目不足と未対応schemaVersionを検出する", () => {
    const missingTitle = createValidSong();
    delete missingTitle.title;
    expectInvalid(missingTitle);
    expectInvalid({ ...createValidSong(), schemaVersion: 2 });
  });

  it("空または5,000件を超えるnotesを検出する", () => {
    expectInvalid({ ...createValidSong(), notes: [] });

    const template = (
      createValidSong().notes as Array<Record<string, unknown>>
    )[0]!;
    const notes = Array.from({ length: 5_001 }, (_, index) => ({
      ...template,
      id: `n${index}`,
    }));

    expectInvalid({
      ...createValidSong(),
      displayRange: { mode: "auto" },
      notes,
    });
  });

  it("音符ID重複を検出し、同時刻の異なる音符は許可する", () => {
    const song = createValidSong();
    const notes = song.notes as Array<Record<string, unknown>>;
    notes[1] = { ...notes[1], id: "n1", time: 0 };
    expectInvalid(song);

    notes[1] = { ...notes[1], id: "n2" };
    expect(validateSong(song).success).toBe(true);
  });

  it.each([20, 300])("境界値のBPM %iを許可する", (bpm) => {
    expect(validateSong({ ...createValidSong(), bpm }).success).toBe(true);
  });

  it.each([19, 301])("範囲外のBPM %iを拒否する", (bpm) => {
    expectInvalid({ ...createValidSong(), bpm });
  });

  it.each([1, 32])("境界値の拍子分子 %iを許可する", (numerator) => {
    expect(
      validateSong({
        ...createValidSong(),
        timeSignature: { numerator, denominator: 4 },
      }).success,
    ).toBe(true);
  });

  it.each([0, 33])("範囲外の拍子分子 %iを拒否する", (numerator) => {
    expectInvalid({
      ...createValidSong(),
      timeSignature: { numerator, denominator: 4 },
    });
  });

  it.each([1, 2, 4, 8, 16, 32])(
    "対応する拍子分母 %iを許可する",
    (denominator) => {
      expect(
        validateSong({
          ...createValidSong(),
          timeSignature: { numerator: 4, denominator },
        }).success,
      ).toBe(true);
    },
  );

  it("未対応の拍子分母を拒否する", () => {
    expectInvalid({
      ...createValidSong(),
      timeSignature: { numerator: 4, denominator: 3 },
    });
  });

  it.each([
    ["時刻", { time: -1 }],
    ["長さ", { duration: 0 }],
    ["指番号", { finger: 6 }],
    ["MIDI範囲", { pitch: 20 }],
  ])("不正な%sを検出する", (_name, replacement) => {
    const song = createValidSong();
    const notes = song.notes as Array<Record<string, unknown>>;
    notes[0] = { ...notes[0], ...replacement };
    expectInvalid(song);
  });

  it("pickupBeats省略時と0では従来どおり負のnote.timeを拒否する", () => {
    const omittedPickup = createValidSong();
    const omittedNotes = omittedPickup.notes as Array<Record<string, unknown>>;
    omittedNotes[0] = { ...omittedNotes[0], time: -0.5 };

    expectInvalid(omittedPickup);

    const zeroPickup = createValidSong();
    const zeroNotes = zeroPickup.notes as Array<Record<string, unknown>>;
    zeroNotes[0] = { ...zeroNotes[0], time: -0.5 };

    expectInvalid({ ...zeroPickup, pickupBeats: 0 });
  });

  it("pickupBeats付きの曲では-pickupBeats以上の負のnote.timeを許可する", () => {
    const song = createValidSong();
    const notes = song.notes as Array<Record<string, unknown>>;
    notes[0] = { ...notes[0], time: -1.5, duration: 0.5 };
    notes[1] = { ...notes[1], time: -0.5, duration: 0.5 };

    expect(validateSong({ ...song, pickupBeats: 1.5 }).success).toBe(true);
  });

  it("note.timeが-pickupBeats未満なら拒否する", () => {
    const song = createValidSong();
    const notes = song.notes as Array<Record<string, unknown>>;
    notes[0] = { ...notes[0], time: -1.51 };

    expectInvalid({ ...song, pickupBeats: 1.5 });
  });

  it("pickupBeatsは拍子分子未満にする", () => {
    expect(validateSong({ ...createValidSong(), pickupBeats: 3.99 }).success).toBe(
      true,
    );
    expectInvalid({ ...createValidSong(), pickupBeats: 4 });
    expectInvalid({ ...createValidSong(), pickupBeats: -0.5 });
  });

  it("pitchとspellingの不一致を音符ID付きで検出する", () => {
    const song = createValidSong();
    const notes = song.notes as Array<Record<string, unknown>>;
    notes[0] = { ...notes[0], pitch: 61 };

    const result = validateSong(song);
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          noteId: "n1",
          path: "notes.0.spelling",
        }),
      );
    }
  });

  it("固定表示範囲の逆転と範囲外音符を検出する", () => {
    expectInvalid({
      ...createValidSong(),
      displayRange: { mode: "fixed", minPitch: 65, maxPitch: 60 },
    });
    expectInvalid({
      ...createValidSong(),
      displayRange: { mode: "fixed", minPitch: 61, maxPitch: 64 },
    });
  });
});
