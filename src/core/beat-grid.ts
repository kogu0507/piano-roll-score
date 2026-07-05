export type BeatGridLineKind = "beat" | "measure";

export interface BeatGridLine {
  readonly beat: number;
  readonly position: number;
  readonly kind: BeatGridLineKind;
}

export interface BeatGridOptions {
  readonly beatsPerMeasure: number;
  readonly displayBeat: number;
  readonly pixelsPerBeat: number;
  readonly originPosition: number;
  readonly viewportStart: number;
  readonly viewportEnd: number;
  readonly direction: 1 | -1;
}

const EPSILON = 1e-9;

export function normalizeBeatsPerMeasure(beatsPerMeasure: number): number {
  if (!Number.isFinite(beatsPerMeasure) || beatsPerMeasure < 1) {
    return 1;
  }

  return Math.max(1, Math.round(beatsPerMeasure));
}

export function classifyBeatGridLine(
  beat: number,
  beatsPerMeasure: number,
): BeatGridLineKind {
  const normalizedBeatsPerMeasure =
    normalizeBeatsPerMeasure(beatsPerMeasure);
  const normalizedRemainder =
    ((beat % normalizedBeatsPerMeasure) + normalizedBeatsPerMeasure) %
    normalizedBeatsPerMeasure;

  return normalizedRemainder === 0 ? "measure" : "beat";
}

export function calculateBeatGridLinePosition(
  beat: number,
  displayBeat: number,
  originPosition: number,
  pixelsPerBeat: number,
  direction: 1 | -1,
): number {
  return originPosition + (beat - displayBeat) * pixelsPerBeat * direction;
}

export function createBeatGridLines(
  options: BeatGridOptions,
): readonly BeatGridLine[] {
  if (
    !Number.isFinite(options.displayBeat) ||
    !Number.isFinite(options.originPosition) ||
    !Number.isFinite(options.pixelsPerBeat) ||
    options.pixelsPerBeat <= 0
  ) {
    return [];
  }

  const viewportStart = Math.min(options.viewportStart, options.viewportEnd);
  const viewportEnd = Math.max(options.viewportStart, options.viewportEnd);
  const startBeat =
    options.displayBeat +
    ((viewportStart - options.originPosition) /
      (options.pixelsPerBeat * options.direction));
  const endBeat =
    options.displayBeat +
    ((viewportEnd - options.originPosition) /
      (options.pixelsPerBeat * options.direction));
  const firstBeat = Math.ceil(Math.min(startBeat, endBeat) - EPSILON);
  const lastBeat = Math.floor(Math.max(startBeat, endBeat) + EPSILON);
  const lines: BeatGridLine[] = [];

  for (let beat = firstBeat; beat <= lastBeat; beat += 1) {
    const position = calculateBeatGridLinePosition(
      beat,
      options.displayBeat,
      options.originPosition,
      options.pixelsPerBeat,
      options.direction,
    );

    lines.push({
      beat,
      position,
      kind: classifyBeatGridLine(beat, options.beatsPerMeasure),
    });
  }

  return lines;
}
