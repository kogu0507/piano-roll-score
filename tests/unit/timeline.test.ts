import { describe, expect, it } from "vitest";

import {
  calculateAdvancedBeat,
  calculateBeatsPerSecond,
  calculateDisplayBeat,
  calculateSongEndBeat,
  clampBeat,
  createInitialPlaybackState,
  finishPlaybackState,
  normalizePlaybackRate,
  pausePlaybackState,
  resetPlaybackState,
  seekPlaybackState,
  setPrecountMeasuresState,
  startPrecountPlaybackState,
  startPlaybackState,
  updatePrecountPlaybackState,
} from "../../src/core/timeline";
import type {
  MetronomePlaybackConfig,
  MetronomeScheduler,
} from "../../src/audio/metronome";
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

const pickupTimelineSong: Song = {
  ...timelineSong,
  pickupBeats: 1.5,
  notes: [
    {
      ...timelineSong.notes[0]!,
      id: "pickup",
      time: -1.5,
      duration: 0.5,
    },
    {
      ...timelineSong.notes[1]!,
      id: "bar-start",
      time: 0,
      duration: 1,
    },
    {
      ...timelineSong.notes[1]!,
      id: "ending",
      time: 3.5,
      duration: 0.75,
    },
  ],
};

class FakeMetronome implements MetronomeScheduler {
  readonly starts: MetronomePlaybackConfig[] = [];
  stopCount = 0;

  start(config: MetronomePlaybackConfig): void {
    this.starts.push(config);
  }

  stop(): void {
    this.stopCount += 1;
  }
}

describe("共通タイムライン", () => {
  it("音符のtime+duration最大値から曲の終端拍を計算する", () => {
    expect(calculateSongEndBeat(timelineSong)).toBe(4.25);
  });

  it("アウフタクト曲の終端拍を正規化後の再生時刻で計算する", () => {
    expect(calculateSongEndBeat(pickupTimelineSong)).toBe(5.75);
    expect(createInitialPlaybackState(pickupTimelineSong).endBeat).toBe(5.75);
  });

  it("BPMと再生速度から1秒あたりの拍数を計算する", () => {
    expect(calculateBeatsPerSecond(120, 1)).toBe(2);
    expect(calculateBeatsPerSecond(120, 0.5)).toBe(1);
    expect(calculateBeatsPerSecond(120, 2)).toBe(4);
  });

  it("再生速度と再生位置を許容範囲へ正規化する", () => {
    expect(normalizePlaybackRate(0.1)).toBe(0.5);
    expect(normalizePlaybackRate(1.26)).toBe(1.25);
    expect(normalizePlaybackRate(1.74)).toBe(1.75);
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

  it("プリカウント開始、完了、再生開始の状態遷移を計算する", () => {
    const initial = setPrecountMeasuresState(
      createInitialPlaybackState(timelineSong),
      1,
    );
    const precount = startPrecountPlaybackState(initial, 4);
    const counting = updatePrecountPlaybackState(precount, 1.25);
    const playing = updatePrecountPlaybackState(counting, 4);

    expect(precount).toMatchObject({
      status: "precount",
      currentBeat: 0,
      precountTotalBeats: 4,
      precountRemainingBeats: 4,
    });
    expect(counting).toMatchObject({
      status: "precount",
      currentBeat: 0,
      precountRemainingBeats: 3,
    });
    expect(playing).toMatchObject({
      status: "playing",
      currentBeat: 0,
      precountTotalBeats: 0,
      precountRemainingBeats: 0,
    });
  });

  it("プリカウント中は実再生位置を進めず、表示用拍位置だけ助走させる", () => {
    const initial = setPrecountMeasuresState(
      createInitialPlaybackState(timelineSong),
      1,
    );
    const precount = startPrecountPlaybackState(initial, 4);
    const halfCount = updatePrecountPlaybackState(precount, 1.5);
    const playing = updatePrecountPlaybackState(halfCount, 4);

    expect(precount.currentBeat).toBe(0);
    expect(calculateDisplayBeat(precount)).toBe(-4);
    expect(halfCount).toMatchObject({
      status: "precount",
      currentBeat: 0,
    });
    expect(calculateDisplayBeat(halfCount)).toBeCloseTo(-2.5);
    expect(playing).toMatchObject({
      status: "playing",
      currentBeat: 0,
    });
    expect(calculateDisplayBeat(playing)).toBe(0);
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

  it("再生速度変更時は画面位置とメトロノーム次拍を同じ基準時刻から計算する", () => {
    let now = 0;
    const nowCalls: number[] = [];
    const metronome = new FakeMetronome();
    const controller = new PlaybackController(
      timelineSong,
      () => {
        nowCalls.push(now);
        return now;
      },
      metronome,
    );

    controller.setMetronomeEnabled(true);
    controller.start();
    now = 250;
    const callsBeforeRateChange = nowCalls.length;
    controller.setPlaybackRate(2);

    const rateChangeCallCount = nowCalls.length - callsBeforeRateChange;
    const latestMetronomeStart = metronome.starts.at(-1);

    expect(rateChangeCallCount).toBe(1);
    expect(controller.getSnapshot()).toMatchObject({
      status: "playing",
      currentBeat: 0.5,
      playbackRate: 2,
    });
    expect(latestMetronomeStart).toMatchObject({
      playbackRate: 2,
      startBeatIndex: 1,
    });
    expect(latestMetronomeStart?.startDelaySeconds).toBeCloseTo(0.125);

    controller.tick(375);
    expect(controller.getSnapshot().currentBeat).toBeCloseTo(1);
  });

  it("アウフタクト曲ではメトロノームをscoreTimeの整数拍へ合わせる", () => {
    let now = 0;
    const metronome = new FakeMetronome();
    const controller = new PlaybackController(
      pickupTimelineSong,
      () => now,
      metronome,
    );

    controller.setMetronomeEnabled(true);
    controller.start();

    expect(controller.getSnapshot()).toMatchObject({
      status: "playing",
      currentBeat: 0,
    });
    expect(metronome.starts.at(-1)).toMatchObject({
      startBeatIndex: -1,
    });
    expect(metronome.starts.at(-1)?.startDelaySeconds).toBeCloseTo(0.25);

    now = 750;
    controller.tick();

    expect(controller.getSnapshot().currentBeat).toBeCloseTo(1.5);
    expect(metronome.starts.at(-1)?.startBeatIndex).toBe(-1);
  });

  it("コントローラはプリカウント中にcurrentBeatを進めず、予約音を停止できる", () => {
    let now = 0;
    const metronome = new FakeMetronome();
    const controller = new PlaybackController(
      timelineSong,
      () => now,
      metronome,
    );

    controller.setMetronomeEnabled(true);
    controller.setPrecountMeasures(1);
    controller.start();
    now = 500;
    controller.tick();

    expect(controller.getSnapshot()).toMatchObject({
      status: "precount",
      currentBeat: 0,
      precountRemainingBeats: 3,
    });
    expect(metronome.starts.at(-1)).toMatchObject({
      enabled: true,
      startBeatIndex: 0,
      maxBeatCount: 4,
    });

    now = 2000;
    controller.tick();
    expect(controller.getSnapshot()).toMatchObject({
      status: "playing",
      currentBeat: 0,
    });

    now = 2500;
    controller.tick();
    expect(controller.getSnapshot().currentBeat).toBe(1);

    controller.seek(1.5);
    expect(controller.getSnapshot()).toMatchObject({
      status: "playing",
      currentBeat: 1.5,
    });
    expect(metronome.stopCount).toBeGreaterThan(0);

    controller.resetToStart();
    expect(controller.getSnapshot()).toMatchObject({
      status: "stopped",
      currentBeat: 0,
    });
    expect(metronome.stopCount).toBeGreaterThan(1);
  });
});
