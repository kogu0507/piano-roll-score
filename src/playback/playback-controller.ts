import {
  calculateMeasureBeats,
  calculateNextBeatDelaySeconds,
  calculateNextBeatIndex,
} from "../core/metronome-timing";
import {
  calculateAdvancedBeat,
  calculateBeatsPerSecond,
  createInitialPlaybackState,
  finishPlaybackState,
  pausePlaybackState,
  resetPlaybackState,
  seekPlaybackState,
  setMetronomeEnabledState,
  setMetronomeVolumeState,
  setPrecountMeasuresState,
  setPlaybackRateState,
  startPrecountPlaybackState,
  startPlaybackState,
  updatePrecountPlaybackState,
  type PlaybackState,
} from "../core/timeline";
import type { MetronomeScheduler } from "../audio/metronome";
import type { Song } from "../schema/song-schema";

type PlaybackListener = (state: PlaybackState) => void;
type NowProvider = () => number;

export class PlaybackController {
  private state: PlaybackState;
  private readonly listeners = new Set<PlaybackListener>();
  private readonly now: NowProvider;
  private readonly songBpm: number;
  private readonly beatsPerMeasure: number;
  private readonly pickupBeats: number;
  private readonly metronome?: MetronomeScheduler;
  private anchorBeat = 0;
  private anchorTimeMs = 0;
  private precountAnchorElapsedBeats = 0;
  private precountAnchorTimeMs = 0;

  constructor(
    song: Song,
    now: NowProvider = () => performance.now(),
    metronome?: MetronomeScheduler,
  ) {
    this.state = createInitialPlaybackState(song);
    this.now = now;
    this.songBpm = song.bpm;
    this.pickupBeats = song.pickupBeats ?? 0;
    this.beatsPerMeasure = calculateMeasureBeats(
      song.timeSignature.numerator,
    );
    this.metronome = metronome;
  }

  getSnapshot(): PlaybackState {
    return this.state;
  }

  subscribe(listener: PlaybackListener): () => void {
    this.listeners.add(listener);
    listener(this.state);

    return () => {
      this.listeners.delete(listener);
    };
  }

  start(): PlaybackState {
    const nowMs = this.now();
    const shouldUsePrecount =
      (this.state.status === "stopped" || this.state.status === "ended") &&
      this.state.precountMeasures > 0;

    this.state = shouldUsePrecount
      ? startPrecountPlaybackState(this.state, this.beatsPerMeasure)
      : startPlaybackState(this.state);

    if (this.state.status === "precount") {
      this.precountAnchorElapsedBeats = this.state.precountElapsedBeats;
      this.precountAnchorTimeMs = nowMs;
    } else {
      this.anchorBeat = this.state.currentBeat;
      this.anchorTimeMs = nowMs;
    }

    this.syncMetronome();
    this.emit();
    return this.state;
  }

  pause(): PlaybackState {
    const nowMs = this.now();
    this.tick(nowMs);
    this.state = pausePlaybackState(this.state);
    this.anchorBeat = this.state.currentBeat;
    this.anchorTimeMs = nowMs;
    this.stopMetronome();
    this.emit();
    return this.state;
  }

  resetToStart(): PlaybackState {
    const nowMs = this.now();
    this.state = resetPlaybackState(this.state);
    this.anchorBeat = 0;
    this.anchorTimeMs = nowMs;
    this.precountAnchorElapsedBeats = 0;
    this.precountAnchorTimeMs = this.anchorTimeMs;
    this.stopMetronome();
    this.emit();
    return this.state;
  }

  seek(beat: number): PlaybackState {
    const nowMs = this.now();
    this.state = seekPlaybackState(this.state, beat);
    this.anchorBeat = this.state.currentBeat;
    this.anchorTimeMs = nowMs;
    this.precountAnchorElapsedBeats = 0;
    this.precountAnchorTimeMs = this.anchorTimeMs;
    this.syncMetronome();
    this.emit();
    return this.state;
  }

  setPlaybackRate(playbackRate: number): PlaybackState {
    const nowMs = this.now();
    this.tick(nowMs);
    this.state = setPlaybackRateState(this.state, playbackRate);
    this.anchorBeat = this.state.currentBeat;
    this.anchorTimeMs = nowMs;
    this.precountAnchorElapsedBeats = this.state.precountElapsedBeats;
    this.precountAnchorTimeMs = this.anchorTimeMs;
    this.syncMetronome();
    this.emit();
    return this.state;
  }

  setMetronomeEnabled(enabled: boolean): PlaybackState {
    this.tick(this.now());
    this.state = setMetronomeEnabledState(this.state, enabled);
    this.syncMetronome();
    this.emit();
    return this.state;
  }

  setMetronomeVolume(volume: number): PlaybackState {
    this.tick(this.now());
    this.state = setMetronomeVolumeState(this.state, volume);
    this.syncMetronome();
    this.emit();
    return this.state;
  }

  setPrecountMeasures(measures: number): PlaybackState {
    this.state = setPrecountMeasuresState(this.state, measures);
    this.emit();
    return this.state;
  }

  tick(nowMs = this.now()): PlaybackState {
    if (this.state.status === "precount") {
      const elapsedMilliseconds = nowMs - this.precountAnchorTimeMs;
      const elapsedBeats =
        this.precountAnchorElapsedBeats +
        Math.max(0, elapsedMilliseconds / 1000) *
          calculateBeatsPerSecond(this.songBpm, this.state.playbackRate);
      const nextState = updatePrecountPlaybackState(this.state, elapsedBeats);

      if (nextState.status === "playing") {
        this.state = nextState;
        this.anchorBeat = this.state.currentBeat;
        this.anchorTimeMs = nowMs;
        this.precountAnchorElapsedBeats = 0;
        this.precountAnchorTimeMs = nowMs;
        this.syncMetronome();
        this.emit();
        return this.state;
      }

      this.state = nextState;
      this.emit();
      return this.state;
    }

    if (this.state.status !== "playing") {
      return this.state;
    }

    const nextBeat = calculateAdvancedBeat(
      this.anchorBeat,
      nowMs - this.anchorTimeMs,
      this.getBpm(),
      this.state.playbackRate,
      this.state.endBeat,
    );

    if (nextBeat >= this.state.endBeat) {
      this.state = finishPlaybackState(this.state);
      this.anchorBeat = this.state.currentBeat;
      this.anchorTimeMs = nowMs;
      this.stopMetronome();
      this.emit();
      return this.state;
    }

    this.state = {
      ...this.state,
      currentBeat: nextBeat,
    };
    this.emit();
    return this.state;
  }

  pauseForVisibilityChange(): PlaybackState {
    if (this.state.status !== "playing" && this.state.status !== "precount") {
      return this.state;
    }

    return this.pause();
  }

  private getBpm(): number {
    return this.songBpm;
  }

  private emit(): void {
    this.listeners.forEach((listener) => {
      listener(this.state);
    });
  }

  private syncMetronome(): void {
    if (this.metronome === undefined) {
      return;
    }

    if (this.state.status === "precount") {
      const nextBeatIndex = calculateNextBeatIndex(
        this.state.precountElapsedBeats,
      );
      const remainingPrecountBeats =
        this.state.precountTotalBeats - nextBeatIndex;

      this.metronome.stop();
      this.metronome.start({
        enabled: this.state.metronomeEnabled,
        bpm: this.songBpm,
        playbackRate: this.state.playbackRate,
        beatsPerMeasure: this.beatsPerMeasure,
        volume: this.state.metronomeVolume,
        startBeatIndex: nextBeatIndex,
        startDelaySeconds: calculateNextBeatDelaySeconds(
          this.state.precountElapsedBeats,
          this.songBpm,
          this.state.playbackRate,
        ),
        maxBeatCount: Math.max(0, remainingPrecountBeats),
      });
      return;
    }

    if (this.state.status === "playing") {
      this.metronome.stop();
      this.metronome.start({
        enabled: this.state.metronomeEnabled,
        bpm: this.songBpm,
        playbackRate: this.state.playbackRate,
        beatsPerMeasure: this.beatsPerMeasure,
        volume: this.state.metronomeVolume,
        startBeatIndex: calculateNextBeatIndex(
          this.state.currentBeat,
          this.pickupBeats,
        ),
        startDelaySeconds: calculateNextBeatDelaySeconds(
          this.state.currentBeat,
          this.songBpm,
          this.state.playbackRate,
          this.pickupBeats,
        ),
      });
      return;
    }

    this.stopMetronome();
  }

  private stopMetronome(): void {
    this.metronome?.stop();
  }
}
