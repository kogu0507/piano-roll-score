import { describe, expect, it } from "vitest";

import {
  calculateAdvancedBeat,
  calculateBeatsPerSecond,
  calculateSongEndBeat,
  clampBeat,
  createInitialPlaybackState,
  finishPlaybackState,
  normalizePlaybackRate,
  pausePlaybackState,
  resetPlaybackState,
  seekPlaybackState,
  startPlaybackState,
} from "../../src/core/timeline";
import { PlaybackController } from "../../src/playback/playback-controller";
import type { Song } from "../../src/schema/song-schema";

const timelineSong: Song = {
  schemaVersion: 1,
  title: "タイムラインテスト",
  bpm: 120,
  timeSignature: {
    numerator: 4,
    denominator: 4,
  },
  clef: "treble",
  displayRange: {
    mode: "auto",
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
      hand: "right",
      time: 0,
      duration: 1,
    },
    {
      id: "n2",
      pitch: 62,
      spelling: {
        step: "D",
        accidental: "natural",
        octave: 4,
      },
      hand: "right",
      time: 3.5,
      duration: 0.75,
    },
  ],
};

describe("共通タイムライン", () => {
  it("音符のtime+duration最大値から曲の終端拍を計算する", () => {
    expect(calculateSongEndBeat(timelineSong)).toBe(4.25);
  });

  it("BPMと再生速度から1秒あたりの拍数を計算する", () => {
    expect(calculateBeatsPerSecond(120, 1)).toBe(2);
    expect(calculateBeatsPerSecond(120, 0.5)).toBe(1);
    expect(calculateBeatsPerSecond(120, 2)).toBe(4);
  });

  it("再生速度と再生位置を許容範囲へ正規化する", () => {
    expect(normalizePlaybackRate(0.1)).toBe(0.5);
    expect(normalizePlaybackRate(1.26)).toBe(1.3);
    expect(normalizePlaybackRate(3)).toBe(2);
    expect(normalizePlaybackRate(Number.NaN)).toBe(1);
    expect(clampBeat(-1, 4.25)).toBe(0);
    expect(clampBeat(99, 4.25)).toBe(4.25);
  });

  it("経過時間から再生位置を進め、終端で丸める", () => {
    expect(calculateAdvancedBeat(1, 500, 120, 1, 4.25)).toBe(2);
    expect(calculateAdvancedBeat(3.5, 1000, 120, 1, 4.25)).toBe(4.25);
  });

  it("スタート、一時停止、先頭戻し、終了、シークの状態遷移を計算する", () => {
    const initial = createInitialPlaybackState(timelineSong);
    const playing = startPlaybackState(initial);
    const paused = pausePlaybackState({ ...playing, currentBeat: 1.25 });
    const seeked = seekPlaybackState(paused, 2.5);
    const ended = finishPlaybackState(seeked);
    const restarted = startPlaybackState(ended);
    const reset = resetPlaybackState(restarted);

    expect(initial.status).toBe("stopped");
    expect(playing.status).toBe("playing");
    expect(paused).toMatchObject({
      status: "paused",
      currentBeat: 1.25,
    });
    expect(seeked).toMatchObject({
      status: "paused",
      currentBeat: 2.5,
    });
    expect(ended).toMatchObject({
      status: "ended",
      currentBeat: 4.25,
    });
    expect(restarted).toMatchObject({
      status: "playing",
      currentBeat: 0,
    });
    expect(reset).toMatchObject({
      status: "stopped",
      currentBeat: 0,
    });
  });

  it("コントローラは経過時間から再生し、速度変更と非表示時一時停止を反映する", () => {
    let now = 0;
    const controller = new PlaybackController(timelineSong, () => now);
    const snapshots: string[] = [];
    controller.subscribe((state) => {
      snapshots.push(`${state.status}:${state.currentBeat.toFixed(2)}`);
    });

    controller.start();
    now = 500;
    controller.tick();
    expect(controller.getSnapshot()).toMatchObject({
      status: "playing",
      currentBeat: 1,
    });

    controller.setPlaybackRate(2);
    now = 750;
    controller.tick();
    expect(controller.getSnapshot().currentBeat).toBe(2);

    now = 1000;
    controller.pauseForVisibilityChange();
    expect(controller.getSnapshot().status).toBe("paused");
    expect(controller.getSnapshot().currentBeat).toBe(3);
    expect(snapshots.some((snapshot) => snapshot.startsWith("playing:"))).toBe(
      true,
    );
  });
});
