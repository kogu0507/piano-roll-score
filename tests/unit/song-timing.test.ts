import { describe, expect, it } from "vitest";

import {
  calculateNotePlaybackEndTime,
  calculateNotePlaybackTime,
  calculateSongPlaybackEndBeat,
  playbackTimeToScoreTime,
  scoreTimeToPlaybackTime,
} from "../../src/core/song-timing";
import type { Song } from "../../src/schema/song-schema";

const pickupSong: Song = {
  schemaVersion: 1,
  title: "アウフタクト時刻テスト",
  bpm: 96,
  timeSignature: {
    numerator: 4,
    denominator: 4,
  },
  pickupBeats: 1.5,
  clef: "treble",
  displayRange: {
    mode: "auto",
  },
  notes: [
    {
      id: "pickup",
      pitch: 67,
      spelling: {
        step: "G",
        accidental: "natural",
        octave: 4,
      },
      hand: "right",
      time: -1.5,
      duration: 0.5,
    },
    {
      id: "bar-start",
      pitch: 60,
      spelling: {
        step: "C",
        accidental: "natural",
        octave: 4,
      },
      hand: "right",
      time: 0,
      duration: 1,
    },
    {
      id: "ending",
      pitch: 64,
      spelling: {
        step: "E",
        accidental: "natural",
        octave: 4,
      },
      hand: "right",
      time: 2,
      duration: 2,
    },
  ],
};

describe("楽曲時刻の正規化", () => {
  it("scoreTimeとplaybackTimeをpickupBeatsで相互変換する", () => {
    expect(scoreTimeToPlaybackTime(-1.5, 1.5)).toBe(0);
    expect(scoreTimeToPlaybackTime(0, 1.5)).toBe(1.5);
    expect(playbackTimeToScoreTime(0, 1.5)).toBe(-1.5);
    expect(playbackTimeToScoreTime(1.5, 1.5)).toBe(0);
  });

  it("音符の再生時刻をnote.time + pickupBeatsで計算する", () => {
    expect(calculateNotePlaybackTime(pickupSong.notes[0]!, 1.5)).toBe(0);
    expect(calculateNotePlaybackTime(pickupSong.notes[1]!, 1.5)).toBe(1.5);
    expect(calculateNotePlaybackEndTime(pickupSong.notes[2]!, 1.5)).toBe(5.5);
  });

  it("曲の終端拍を正規化後の再生時刻で計算する", () => {
    expect(calculateSongPlaybackEndBeat(pickupSong)).toBe(5.5);
  });
});
