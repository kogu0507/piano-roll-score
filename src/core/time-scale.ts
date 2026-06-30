export const DEFAULT_TIME_SCALE = 1;
export const MIN_TIME_SCALE = 0.5;
export const MAX_TIME_SCALE = 2;
export const TIME_SCALE_STEP = 0.05;

export function normalizeTimeScale(timeScale: number): number {
  if (!Number.isFinite(timeScale)) {
    return DEFAULT_TIME_SCALE;
  }

  const stepped = Math.round(timeScale / TIME_SCALE_STEP) * TIME_SCALE_STEP;

  return Math.min(
    MAX_TIME_SCALE,
    Math.max(MIN_TIME_SCALE, Number(stepped.toFixed(2))),
  );
}

export function timeScaleToPercent(timeScale: number): number {
  return Math.round(normalizeTimeScale(timeScale) * 100);
}

export function percentToTimeScale(percent: number): number {
  if (!Number.isFinite(percent)) {
    return DEFAULT_TIME_SCALE;
  }

  return normalizeTimeScale(percent / 100);
}
