import {
  DEFAULT_METRONOME_VOLUME,
  calculatePrecountBeats,
  normalizeMetronomeVolume,
  normalizePrecountMeasures,
  type PrecountMeasures,
} from "./metronome-timing";
import type { Song } from "../schema/song-schema";

export const MIN_PLAYBACK_RATE = 0.5;
export const MAX_PLAYBACK_RATE = 2;
export const DEFAULT_PLAYBACK_RATE = 1;

export type PlaybackStatus =
  | "stopped"
  | "precount"
  | "playing"
  | "paused"
  | "ended";

export interface PlaybackState {
  readonly status: PlaybackStatus;
  readonly currentBeat: number;
  readonly endBeat: number;
  readonly playbackRate: number;
  readonly metronomeEnabled: boolean;
  readonly metronomeVolume: number;
  readonly precountMeasures: PrecountMeasures;
  readonly precountTotalBeats: number;
  readonly precountRemainingBeats: number;
  readonly precountElapsedBeats: number;
}

export function calculateSongEndBeat(song: Song): number {
  return Math.max(
    0,
    ...song.notes.map((note) => note.time + note.duration),
  );
}

export function normalizePlaybackRate(playbackRate: number): number {
  if (!Number.isFinite(playbackRate)) {
    return DEFAULT_PLAYBACK_RATE;
  }

  return Math.min(
    MAX_PLAYBACK_RATE,
    Math.max(MIN_PLAYBACK_RATE, Math.round(playbackRate * 4) / 4),
  );
}

export function formatPlaybackRate(playbackRate: number): string {
  return String(normalizePlaybackRate(playbackRate));
}

export function calculateBeatsPerSecond(
  bpm: number,
  playbackRate: number,
): number {
  if (!Number.isFinite(bpm) || bpm <= 0) {
    return 0;
  }

  return (bpm / 60) * normalizePlaybackRate(playbackRate);
}

export function clampBeat(beat: number, endBeat: number): number {
  if (!Number.isFinite(beat)) {
    return 0;
  }

  return Math.min(Math.max(0, endBeat), Math.max(0, beat));
}

export function calculateAdvancedBeat(
  startBeat: number,
  elapsedMilliseconds: number,
  bpm: number,
  playbackRate: number,
  endBeat: number,
): number {
  if (!Number.isFinite(elapsedMilliseconds) || elapsedMilliseconds <= 0) {
    return clampBeat(startBeat, endBeat);
  }

  const elapsedSeconds = elapsedMilliseconds / 1000;
  const nextBeat =
    startBeat + elapsedSeconds * calculateBeatsPerSecond(bpm, playbackRate);

  return clampBeat(nextBeat, endBeat);
}

export function createInitialPlaybackState(song: Song): PlaybackState {
  return {
    status: "stopped",
    currentBeat: 0,
    endBeat: calculateSongEndBeat(song),
    playbackRate: DEFAULT_PLAYBACK_RATE,
    metronomeEnabled: false,
    metronomeVolume: DEFAULT_METRONOME_VOLUME,
    precountMeasures: 0,
    precountTotalBeats: 0,
    precountRemainingBeats: 0,
    precountElapsedBeats: 0,
  };
}

export function startPlaybackState(state: PlaybackState): PlaybackState {
  const shouldRestart =
    state.status === "ended" || state.currentBeat >= state.endBeat;

  return {
    ...state,
    status: "playing",
    currentBeat: shouldRestart ? 0 : clampBeat(state.currentBeat, state.endBeat),
    precountTotalBeats: 0,
    precountRemainingBeats: 0,
    precountElapsedBeats: 0,
  };
}

export function pausePlaybackState(state: PlaybackState): PlaybackState {
  if (state.status !== "playing" && state.status !== "precount") {
    return state;
  }

  return {
    ...state,
    status: "paused",
    currentBeat: clampBeat(state.currentBeat, state.endBeat),
    precountTotalBeats: 0,
    precountRemainingBeats: 0,
    precountElapsedBeats: 0,
  };
}

export function resetPlaybackState(state: PlaybackState): PlaybackState {
  return {
    ...state,
    status: "stopped",
    currentBeat: 0,
    precountTotalBeats: 0,
    precountRemainingBeats: 0,
    precountElapsedBeats: 0,
  };
}

export function finishPlaybackState(state: PlaybackState): PlaybackState {
  return {
    ...state,
    status: "ended",
    currentBeat: state.endBeat,
    precountTotalBeats: 0,
    precountRemainingBeats: 0,
    precountElapsedBeats: 0,
  };
}

export function seekPlaybackState(
  state: PlaybackState,
  beat: number,
): PlaybackState {
  const currentBeat = clampBeat(beat, state.endBeat);

  if (currentBeat >= state.endBeat) {
    return {
      ...state,
      status: "ended",
      currentBeat,
      precountTotalBeats: 0,
      precountRemainingBeats: 0,
      precountElapsedBeats: 0,
    };
  }

  const status =
    state.status === "playing"
      ? "playing"
      : currentBeat === 0 && state.status === "stopped"
        ? "stopped"
        : "paused";

  return {
    ...state,
    status,
    currentBeat,
    precountTotalBeats: 0,
    precountRemainingBeats: 0,
    precountElapsedBeats: 0,
  };
}

export function setPlaybackRateState(
  state: PlaybackState,
  playbackRate: number,
): PlaybackState {
  return {
    ...state,
    playbackRate: normalizePlaybackRate(playbackRate),
  };
}

export function setMetronomeEnabledState(
  state: PlaybackState,
  enabled: boolean,
): PlaybackState {
  return {
    ...state,
    metronomeEnabled: enabled,
  };
}

export function setMetronomeVolumeState(
  state: PlaybackState,
  volume: number,
): PlaybackState {
  return {
    ...state,
    metronomeVolume: normalizeMetronomeVolume(volume),
  };
}

export function setPrecountMeasuresState(
  state: PlaybackState,
  measures: number,
): PlaybackState {
  return {
    ...state,
    precountMeasures: normalizePrecountMeasures(measures),
  };
}

export function startPrecountPlaybackState(
  state: PlaybackState,
  numerator: number,
): PlaybackState {
  const startState =
    state.status === "ended" || state.currentBeat >= state.endBeat
      ? { ...state, currentBeat: 0 }
      : state;
  const precountTotalBeats = calculatePrecountBeats(
    numerator,
    startState.precountMeasures,
  );

  if (precountTotalBeats <= 0) {
    return startPlaybackState(startState);
  }

  return {
    ...startState,
    status: "precount",
    precountTotalBeats,
    precountRemainingBeats: precountTotalBeats,
    precountElapsedBeats: 0,
  };
}

export function updatePrecountPlaybackState(
  state: PlaybackState,
  elapsedBeats: number,
): PlaybackState {
  if (state.status !== "precount") {
    return state;
  }

  const normalizedElapsedBeats = Math.min(
    state.precountTotalBeats,
    Math.max(0, elapsedBeats),
  );

  if (normalizedElapsedBeats >= state.precountTotalBeats) {
    return startPlaybackState({
      ...state,
      status: "paused",
      precountTotalBeats: 0,
      precountRemainingBeats: 0,
      precountElapsedBeats: 0,
    });
  }

  const completedBeats = Math.floor(normalizedElapsedBeats);

  return {
    ...state,
    precountElapsedBeats: normalizedElapsedBeats,
    precountRemainingBeats: state.precountTotalBeats - completedBeats,
  };
}

export function calculateDisplayBeat(state: PlaybackState): number {
  if (state.status !== "precount") {
    return state.currentBeat;
  }

  return (
    state.currentBeat -
    Math.max(0, state.precountTotalBeats - state.precountElapsedBeats)
  );
}

export function formatBeat(beat: number): string {
  return clampBeat(beat, Number.POSITIVE_INFINITY).toFixed(2);
}
