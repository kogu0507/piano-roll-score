import {
  calculateAdvancedBeat,
  createInitialPlaybackState,
  finishPlaybackState,
  pausePlaybackState,
  resetPlaybackState,
  seekPlaybackState,
  setPlaybackRateState,
  startPlaybackState,
  type PlaybackState,
} from "../core/timeline";
import type { Song } from "../schema/song-schema";

type PlaybackListener = (state: PlaybackState) => void;
type NowProvider = () => number;

export class PlaybackController {
  private state: PlaybackState;
  private readonly listeners = new Set<PlaybackListener>();
  private readonly now: NowProvider;
  private readonly songBpm: number;
  private anchorBeat = 0;
  private anchorTimeMs = 0;

  constructor(song: Song, now: NowProvider = () => performance.now()) {
    this.state = createInitialPlaybackState(song);
    this.now = now;
    this.songBpm = song.bpm;
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
    this.state = startPlaybackState(this.state);
    this.anchorBeat = this.state.currentBeat;
    this.anchorTimeMs = this.now();
    this.emit();
    return this.state;
  }

  pause(): PlaybackState {
    this.tick();
    this.state = pausePlaybackState(this.state);
    this.anchorBeat = this.state.currentBeat;
    this.anchorTimeMs = this.now();
    this.emit();
    return this.state;
  }

  resetToStart(): PlaybackState {
    this.state = resetPlaybackState(this.state);
    this.anchorBeat = 0;
    this.anchorTimeMs = this.now();
    this.emit();
    return this.state;
  }

  seek(beat: number): PlaybackState {
    this.state = seekPlaybackState(this.state, beat);
    this.anchorBeat = this.state.currentBeat;
    this.anchorTimeMs = this.now();
    this.emit();
    return this.state;
  }

  setPlaybackRate(playbackRate: number): PlaybackState {
    this.tick();
    this.state = setPlaybackRateState(this.state, playbackRate);
    this.anchorBeat = this.state.currentBeat;
    this.anchorTimeMs = this.now();
    this.emit();
    return this.state;
  }

  tick(nowMs = this.now()): PlaybackState {
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
    if (this.state.status !== "playing") {
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
}
