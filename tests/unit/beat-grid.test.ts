import { describe, expect, it } from "vitest";

import {
  calculateBeatGridLinePosition,
  classifyBeatGridLine,
  createBeatGridLines,
} from "../../src/core/beat-grid";

describe("拍線・小節線の共通計算", () => {
  it("4/4では0, 4, 8, 12...を小節線として扱う", () => {
    expect([0, 4, 8, 12].map((beat) => classifyBeatGridLine(beat, 4))).toEqual(
      ["measure", "measure", "measure", "measure"],
    );
  });

  it("4/4では1, 2, 3, 5, 6, 7...を拍線として扱う", () => {
    expect([1, 2, 3, 5, 6, 7].map((beat) => classifyBeatGridLine(beat, 4))).toEqual(
      ["beat", "beat", "beat", "beat", "beat", "beat"],
    );
  });

  it("3/4では0, 3, 6, 9...を小節線として扱う", () => {
    expect([0, 3, 6, 9].map((beat) => classifyBeatGridLine(beat, 3))).toEqual(
      ["measure", "measure", "measure", "measure"],
    );
    expect([1, 2, 4, 5, 7, 8].map((beat) => classifyBeatGridLine(beat, 3))).toEqual(
      ["beat", "beat", "beat", "beat", "beat", "beat"],
    );
  });

  it("小節線と拍線が重複する位置は小節線として扱う", () => {
    const lines = createBeatGridLines({
      beatsPerMeasure: 4,
      displayBeat: 0,
      pixelsPerBeat: 20,
      originPosition: 0,
      viewportStart: 0,
      viewportEnd: 100,
      direction: 1,
    });

    expect(lines.find((line) => line.beat === 0)?.kind).toBe("measure");
    expect(lines.find((line) => line.beat === 4)?.kind).toBe("measure");
    expect(lines.find((line) => line.beat === 1)?.kind).toBe("beat");
  });

  it("表示範囲に必要な線だけを計算する", () => {
    const lines = createBeatGridLines({
      beatsPerMeasure: 4,
      displayBeat: 2,
      pixelsPerBeat: 10,
      originPosition: 50,
      viewportStart: 20,
      viewportEnd: 80,
      direction: 1,
    });

    expect(lines.map((line) => line.beat)).toEqual([-1, 0, 1, 2, 3, 4, 5]);
    expect(lines.every((line) => line.position >= 20 && line.position <= 80)).toBe(
      true,
    );
  });

  it("負のdisplayBeatによるプリカウント助走中でも線を計算できる", () => {
    const lines = createBeatGridLines({
      beatsPerMeasure: 4,
      displayBeat: -4,
      pixelsPerBeat: 10,
      originPosition: 100,
      viewportStart: 0,
      viewportEnd: 100,
      direction: -1,
    });

    expect(lines[0]).toMatchObject({
      beat: -4,
      position: 100,
      kind: "measure",
    });
    expect(lines.map((line) => line.beat)).toContain(0);
    expect(lines.find((line) => line.beat === 0)?.kind).toBe("measure");
  });

  it("音価の幅倍率が変わると拍線・小節線の表示間隔も追従する", () => {
    expect(calculateBeatGridLinePosition(1, 0, 0, 64, 1)).toBe(64);
    expect(calculateBeatGridLinePosition(1, 0, 0, 128, 1)).toBe(128);

    const normal = createBeatGridLines({
      beatsPerMeasure: 4,
      displayBeat: 0,
      pixelsPerBeat: 64,
      originPosition: 0,
      viewportStart: 0,
      viewportEnd: 256,
      direction: 1,
    });
    const expanded = createBeatGridLines({
      beatsPerMeasure: 4,
      displayBeat: 0,
      pixelsPerBeat: 128,
      originPosition: 0,
      viewportStart: 0,
      viewportEnd: 256,
      direction: 1,
    });

    expect(normal.find((line) => line.beat === 1)?.position).toBe(64);
    expect(normal.find((line) => line.beat === 2)?.position).toBe(128);
    expect(expanded.find((line) => line.beat === 1)?.position).toBe(128);
    expect(expanded.find((line) => line.beat === 2)?.position).toBe(256);
  });

  it("pickupBeats付きではscoreTimeの整数拍をplaybackTime位置へ配置する", () => {
    const lines = createBeatGridLines({
      beatsPerMeasure: 4,
      displayBeat: 0,
      pixelsPerBeat: 20,
      originPosition: 0,
      viewportStart: 0,
      viewportEnd: 80,
      direction: 1,
      pickupBeats: 1.5,
    });

    const pickupBeat = lines.find((line) => line.beat === -1);
    const firstMeasure = lines.find((line) => line.beat === 0);

    expect(pickupBeat).toMatchObject({
      kind: "beat",
      position: 10,
    });
    expect(firstMeasure).toMatchObject({
      kind: "measure",
      position: 30,
    });
  });
});
