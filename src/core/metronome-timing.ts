import { normalizePickupBeats } from "./song-timing";

export const PRECOUNT_MEASURE_OPTIONS = [0, 1, 2] as const;
export type PrecountMeasures = (typeof PRECOUNT_MEASURE_OPTIONS)[number];

export type MetronomeBeatKind = "accent" | "regular";

export const DEFAULT_METRONOME_VOLUME = 0.55;
export const MIN_METRONOME_VOLUME = 0;
export const MAX_METRONOME_VOLUME = 1;
export const METRONOME_ACCENT_FREQUENCY = 1320;
export const METRONOME_REGULAR_FREQUENCY = 880;
export const METRONOME_CLICK_DURATION_SECONDS = 0.045;
export const METRONOME_SCHEDULE_LOOKAHEAD_SECONDS = 0.12;
export const METRONOME_SCHEDULER_INTERVAL_MS = 25;

const BEAT_EPSILON = 0.0001;

export interface ScheduledMetronomeBeat {
  readonly beatIndex: number;
  readonly timeSeconds: number;
  readonly kind: MetronomeBeatKind;
  readonly frequency: number;
  readonly volume: number;
}

export function normalizeMetronomeVolume(volume: number): number {
  if (!Number.isFinite(volume)) {
    return DEFAULT_METRONOME_VOLUME;
  }

  return Math.min(
    MAX_METRONOME_VOLUME,
    Math.max(MIN_METRONOME_VOLUME, Math.round(volume * 100) / 100),
  );
}

export function normalizePrecountMeasures(
  measures: number,
): PrecountMeasures {
  if (measures === 1 || measures === 2) {
    return measures;
  }

  return 0;
}

export function calculateMeasureBeats(numerator: number): number {
  if (!Number.isFinite(numerator)) {
    return 1;
  }

  return Math.max(1, Math.floor(numerator));
}

export function calculatePrecountBeats(
  numerator: number,
  measures: number,
): number {
  return calculateMeasureBeats(numerator) * normalizePrecountMeasures(measures);
}

export function calculatePrecountStartScoreTime(
  numerator: number,
  measures: number,
): number {
  return -calculatePrecountBeats(numerator, measures);
}

export function calculatePlaybackStartScoreTime(pickupBeats: number): number {
  return -normalizePickupBeats(pickupBeats);
}

export function calculatePrecountPlaybackBeats(
  numerator: number,
  measures: number,
  pickupBeats: number,
): number {
  return Math.max(
    0,
    calculatePrecountBeats(numerator, measures) -
      normalizePickupBeats(pickupBeats),
  );
}

export function calculatePrecountScoreTime(
  numerator: number,
  measures: number,
  elapsedBeats: number,
): number {
  return (
    calculatePrecountStartScoreTime(numerator, measures) +
    Math.max(0, Number.isFinite(elapsedBeats) ? elapsedBeats : 0)
  );
}

export function isMeasureAccentBeat(
  beatIndex: number,
  beatsPerMeasure: number,
): boolean {
  const normalizedBeatIndex = Math.floor(beatIndex);
  const normalizedBeatsPerMeasure = calculateMeasureBeats(beatsPerMeasure);
  const remainder =
    ((normalizedBeatIndex % normalizedBeatsPerMeasure) +
      normalizedBeatsPerMeasure) %
    normalizedBeatsPerMeasure;

  return remainder === 0;
}

export function classifyMetronomeBeat(
  beatIndex: number,
  beatsPerMeasure: number,
): MetronomeBeatKind {
  return isMeasureAccentBeat(beatIndex, beatsPerMeasure) ? "accent" : "regular";
}

export function getMetronomeFrequency(
  kind: MetronomeBeatKind,
): number {
  return kind === "accent"
    ? METRONOME_ACCENT_FREQUENCY
    : METRONOME_REGULAR_FREQUENCY;
}

export function calculateMetronomeIntervalSeconds(
  bpm: number,
  playbackRate: number,
): number {
  const beatsPerSecond = calculateMetronomeBeatsPerSecond(bpm, playbackRate);

  return beatsPerSecond <= 0 ? Number.POSITIVE_INFINITY : 1 / beatsPerSecond;
}

export function calculateNextBeatDelaySeconds(
  currentBeat: number,
  bpm: number,
  playbackRate: number,
  pickupBeats = 0,
): number {
  return calculateNextScoreBeatDelaySeconds(
    currentBeat - normalizePickupBeats(pickupBeats),
    bpm,
    playbackRate,
  );
}

function calculateMetronomeBeatsPerSecond(
  bpm: number,
  playbackRate: number,
): number {
  return !Number.isFinite(bpm) || bpm <= 0 || !Number.isFinite(playbackRate)
    ? 0
    : (bpm / 60) * Math.max(0, playbackRate);
}

export function calculateNextBeatIndex(
  currentBeat: number,
  pickupBeats = 0,
): number {
  return calculateNextScoreBeatIndex(
    currentBeat - normalizePickupBeats(pickupBeats),
  );
}

export function calculateNextScoreBeatIndex(scoreTime: number): number {
  if (!Number.isFinite(scoreTime)) {
    return 0;
  }

  return Math.ceil(scoreTime);
}

export function calculateNextScoreBeatDelaySeconds(
  scoreTime: number,
  bpm: number,
  playbackRate: number,
): number {
  if (!Number.isFinite(scoreTime)) {
    return 0;
  }

  const beatsPerSecond = calculateMetronomeBeatsPerSecond(bpm, playbackRate);

  if (beatsPerSecond <= 0) {
    return 0;
  }

  const nextScoreBeat = calculateNextScoreBeatIndex(scoreTime);

  if (Math.abs(scoreTime - nextScoreBeat) < BEAT_EPSILON) {
    return 0;
  }

  return (nextScoreBeat - scoreTime) / beatsPerSecond;
}

export function calculatePrecountMetronomeBeatCount(
  currentScoreTime: number,
  playbackStartScoreTime: number,
): number {
  if (
    !Number.isFinite(currentScoreTime) ||
    !Number.isFinite(playbackStartScoreTime)
  ) {
    return 0;
  }

  const nextBeatIndex = calculateNextScoreBeatIndex(currentScoreTime);
  const firstPlayingBeatIndex = Math.ceil(
    playbackStartScoreTime - BEAT_EPSILON,
  );

  return Math.max(0, firstPlayingBeatIndex - nextBeatIndex);
}

export function createScheduledMetronomeBeats(
  startTimeSeconds: number,
  scheduleUntilSeconds: number,
  startBeatIndex: number,
  beatIntervalSeconds: number,
  beatsPerMeasure: number,
  volume: number,
  maxBeatCount?: number,
): readonly ScheduledMetronomeBeat[] {
  if (
    !Number.isFinite(startTimeSeconds) ||
    !Number.isFinite(scheduleUntilSeconds) ||
    !Number.isFinite(beatIntervalSeconds) ||
    beatIntervalSeconds <= 0 ||
    scheduleUntilSeconds < startTimeSeconds
  ) {
    return [];
  }

  const normalizedVolume = normalizeMetronomeVolume(volume);
  const beats: ScheduledMetronomeBeat[] = [];
  let nextTime = startTimeSeconds;
  let scheduledCount = 0;

  while (
    nextTime <= scheduleUntilSeconds &&
    (maxBeatCount === undefined || scheduledCount < maxBeatCount)
  ) {
    const beatIndex = startBeatIndex + scheduledCount;
    const kind = classifyMetronomeBeat(beatIndex, beatsPerMeasure);

    beats.push({
      beatIndex,
      timeSeconds: nextTime,
      kind,
      frequency: getMetronomeFrequency(kind),
      volume: normalizedVolume,
    });

    scheduledCount += 1;
    nextTime += beatIntervalSeconds;
  }

  return beats;
}
