import { describe, expect, it } from "vitest";

import {
  calculateMeasureBeats,
  calculateMetronomeIntervalSeconds,
  calculateNextBeatDelaySeconds,
  calculateNextBeatIndex,
  calculatePrecountBeats,
  classifyMetronomeBeat,
  createScheduledMetronomeBeats,
  getMetronomeFrequency,
  isMeasureAccentBeat,
  normalizeMetronomeVolume,
} from "../../src/core/metronome-timing";

describe("メトロノームとプリカウントの計算", () => {
  it("timeSignature.numeratorを1小節の拍数として扱う", () => {
    expect(calculateMeasureBeats(4)).toBe(4);
    expect(calculateMeasureBeats(3)).toBe(3);
    expect(calculateMeasureBeats(Number.NaN)).toBe(1);
  });

  it("プリカウントなし、1小節、2小節の拍数を計算する", () => {
    expect(calculatePrecountBeats(4, 0)).toBe(0);
    expect(calculatePrecountBeats(4, 1)).toBe(4);
    expect(calculatePrecountBeats(4, 2)).toBe(8);
    expect(calculatePrecountBeats(3, 1)).toBe(3);
    expect(calculatePrecountBeats(3, 2)).toBe(6);
  });

  it("小節の1拍目をアクセント、それ以外を通常拍として分類する", () => {
    expect(classifyMetronomeBeat(0, 4)).toBe("accent");
    expect(classifyMetronomeBeat(1, 4)).toBe("regular");
    expect(classifyMetronomeBeat(4, 4)).toBe("accent");
    expect(isMeasureAccentBeat(-4, 4)).toBe(true);
    expect(classifyMetronomeBeat(-1, 4)).toBe("regular");
    expect(getMetronomeFrequency("accent")).toBeGreaterThan(
      getMetronomeFrequency("regular"),
    );
  });

  it("BPMと再生速度から拍間隔を計算する", () => {
    expect(calculateMetronomeIntervalSeconds(120, 1)).toBe(0.5);
    expect(calculateMetronomeIntervalSeconds(120, 2)).toBe(0.25);
    expect(calculateMetronomeIntervalSeconds(60, 0.5)).toBe(2);
  });

  it("途中位置から次の拍までの待ち時間と拍番号を計算する", () => {
    expect(calculateNextBeatIndex(1.25)).toBe(2);
    expect(calculateNextBeatDelaySeconds(1.25, 120, 1)).toBeCloseTo(0.375);
    expect(calculateNextBeatDelaySeconds(2, 120, 1)).toBe(0);
  });

  it("pickupBeats付きではscoreTimeの整数位置へクリックを合わせる", () => {
    expect(calculateNextBeatIndex(0, 1.5)).toBe(-1);
    expect(calculateNextBeatDelaySeconds(0, 120, 1, 1.5)).toBeCloseTo(0.25);
    expect(calculateNextBeatIndex(1.5, 1.5)).toBe(0);
    expect(calculateNextBeatDelaySeconds(1.5, 120, 1, 1.5)).toBe(0);
    expect(classifyMetronomeBeat(0, 4)).toBe("accent");
  });

  it("先読み対象の時刻、音種別、音量を計算する", () => {
    const beats = createScheduledMetronomeBeats(
      10,
      11.1,
      0,
      0.5,
      4,
      0.567,
      3,
    );

    expect(beats).toEqual([
      {
        beatIndex: 0,
        timeSeconds: 10,
        kind: "accent",
        frequency: getMetronomeFrequency("accent"),
        volume: normalizeMetronomeVolume(0.567),
      },
      {
        beatIndex: 1,
        timeSeconds: 10.5,
        kind: "regular",
        frequency: getMetronomeFrequency("regular"),
        volume: normalizeMetronomeVolume(0.567),
      },
      {
        beatIndex: 2,
        timeSeconds: 11,
        kind: "regular",
        frequency: getMetronomeFrequency("regular"),
        volume: normalizeMetronomeVolume(0.567),
      },
    ]);
  });
});
