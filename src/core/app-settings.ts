import {
  MAX_WHITE_KEY_WIDTH,
  MIN_WHITE_KEY_WIDTH,
  normalizeWhiteKeyWidth,
} from "./keyboard-geometry";
import { normalizeHorizontalLineSpacing } from "./horizontal-layout";
import {
  DEFAULT_PLAYBACK_RATE,
  MAX_PLAYBACK_RATE,
  MIN_PLAYBACK_RATE,
  normalizePlaybackRate,
} from "./timeline";
import { DEFAULT_TIME_SCALE, normalizeTimeScale } from "./time-scale";
import {
  DEFAULT_METRONOME_VOLUME,
  normalizeMetronomeVolume,
  normalizePrecountMeasures,
  type PrecountMeasures,
} from "./metronome-timing";
import { STAFF_LINE_SPACING } from "./staff-position";

export const APP_SETTINGS_VERSION = 1;
export const MIN_STORED_VIEW_OFFSET = -10_000;
export const MAX_STORED_VIEW_OFFSET = 10_000;

export type ViewOrientation = "portrait" | "landscape";

export interface VerticalViewSettings {
  readonly whiteKeyWidth: number;
  readonly horizontalOffset: number;
  readonly timeScale: number;
}

export interface HorizontalViewSettings {
  readonly lineSpacing: number;
  readonly verticalOffset: number;
  readonly timeScale: number;
}

export interface PlaybackSettings {
  readonly playbackRate: number;
  readonly metronomeEnabled: boolean;
  readonly metronomeVolume: number;
  readonly precountMeasures: PrecountMeasures;
}

export interface DisplayTextSettings {
  readonly showNoteNames: boolean;
  readonly showFingerNumbers: boolean;
}

export interface AppSettings {
  readonly version: typeof APP_SETTINGS_VERSION;
  readonly vertical: Partial<Record<ViewOrientation, VerticalViewSettings>>;
  readonly horizontal: HorizontalViewSettings;
  readonly playback: PlaybackSettings;
  readonly displayText: DisplayTextSettings;
}

export const DEFAULT_HORIZONTAL_VIEW_SETTINGS: HorizontalViewSettings = {
  lineSpacing: STAFF_LINE_SPACING,
  verticalOffset: 0,
  timeScale: DEFAULT_TIME_SCALE,
};

export const DEFAULT_DISPLAY_TEXT_SETTINGS: DisplayTextSettings = {
  showNoteNames: true,
  showFingerNumbers: true,
};

export const DEFAULT_PLAYBACK_SETTINGS: PlaybackSettings = {
  playbackRate: DEFAULT_PLAYBACK_RATE,
  metronomeEnabled: false,
  metronomeVolume: DEFAULT_METRONOME_VOLUME,
  precountMeasures: 0,
};

const DEFAULT_VERTICAL_VIEW_SETTINGS: VerticalViewSettings = {
  whiteKeyWidth: Math.min(
    MAX_WHITE_KEY_WIDTH,
    Math.max(MIN_WHITE_KEY_WIDTH, 64),
  ),
  horizontalOffset: 0,
  timeScale: DEFAULT_TIME_SCALE,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeStoredOffset(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(
    MAX_STORED_VIEW_OFFSET,
    Math.max(MIN_STORED_VIEW_OFFSET, Math.round(value)),
  );
}

export function getViewportOrientation(
  width: number,
  height: number,
): ViewOrientation {
  return width > height ? "landscape" : "portrait";
}

export function normalizeVerticalViewSettings(
  input: unknown,
  fallback: VerticalViewSettings = DEFAULT_VERTICAL_VIEW_SETTINGS,
): VerticalViewSettings {
  if (!isRecord(input)) {
    return fallback;
  }

  return {
    whiteKeyWidth: normalizeWhiteKeyWidth(
      typeof input.whiteKeyWidth === "number"
        ? input.whiteKeyWidth
        : fallback.whiteKeyWidth,
    ),
    horizontalOffset: normalizeStoredOffset(
      input.horizontalOffset,
      fallback.horizontalOffset,
    ),
    timeScale: normalizeTimeScale(
      typeof input.timeScale === "number"
        ? input.timeScale
        : fallback.timeScale,
    ),
  };
}

export function normalizeHorizontalViewSettings(
  input: unknown,
  fallback: HorizontalViewSettings = DEFAULT_HORIZONTAL_VIEW_SETTINGS,
): HorizontalViewSettings {
  if (!isRecord(input)) {
    return fallback;
  }

  return {
    lineSpacing: normalizeHorizontalLineSpacing(
      typeof input.lineSpacing === "number"
        ? input.lineSpacing
        : fallback.lineSpacing,
    ),
    verticalOffset: normalizeStoredOffset(
      input.verticalOffset,
      fallback.verticalOffset,
    ),
    timeScale: normalizeTimeScale(
      typeof input.timeScale === "number"
        ? input.timeScale
        : fallback.timeScale,
    ),
  };
}

export function normalizePlaybackSettings(
  input: unknown,
  fallback: PlaybackSettings = DEFAULT_PLAYBACK_SETTINGS,
): PlaybackSettings {
  if (!isRecord(input)) {
    return fallback;
  }

  return {
    playbackRate: normalizePlaybackRate(
      typeof input.playbackRate === "number"
        ? input.playbackRate
        : fallback.playbackRate,
    ),
    metronomeEnabled:
      typeof input.metronomeEnabled === "boolean"
        ? input.metronomeEnabled
        : fallback.metronomeEnabled,
    metronomeVolume: normalizeMetronomeVolume(
      typeof input.metronomeVolume === "number"
        ? input.metronomeVolume
        : fallback.metronomeVolume,
    ),
    precountMeasures: normalizePrecountMeasures(
      typeof input.precountMeasures === "number"
        ? input.precountMeasures
        : fallback.precountMeasures,
    ),
  };
}

export function normalizeDisplayTextSettings(
  input: unknown,
  fallback: DisplayTextSettings = DEFAULT_DISPLAY_TEXT_SETTINGS,
): DisplayTextSettings {
  if (!isRecord(input)) {
    return fallback;
  }

  return {
    showNoteNames:
      typeof input.showNoteNames === "boolean"
        ? input.showNoteNames
        : fallback.showNoteNames,
    showFingerNumbers:
      typeof input.showFingerNumbers === "boolean"
        ? input.showFingerNumbers
        : fallback.showFingerNumbers,
  };
}

export function normalizeAppSettings(input: unknown): AppSettings {
  if (!isRecord(input) || input.version !== APP_SETTINGS_VERSION) {
    return createDefaultAppSettings();
  }

  const vertical: Partial<Record<ViewOrientation, VerticalViewSettings>> = {};

  if (isRecord(input.vertical)) {
    if (input.vertical.portrait !== undefined) {
      vertical.portrait = normalizeVerticalViewSettings(
        input.vertical.portrait,
      );
    }

    if (input.vertical.landscape !== undefined) {
      vertical.landscape = normalizeVerticalViewSettings(
        input.vertical.landscape,
      );
    }
  }

  return {
    version: APP_SETTINGS_VERSION,
    vertical,
    horizontal: normalizeHorizontalViewSettings(input.horizontal),
    playback: normalizePlaybackSettings(input.playback),
    displayText: normalizeDisplayTextSettings(input.displayText),
  };
}

export function createDefaultAppSettings(): AppSettings {
  return {
    version: APP_SETTINGS_VERSION,
    vertical: {},
    horizontal: DEFAULT_HORIZONTAL_VIEW_SETTINGS,
    playback: DEFAULT_PLAYBACK_SETTINGS,
    displayText: DEFAULT_DISPLAY_TEXT_SETTINGS,
  };
}

export function clampPlaybackSettingsForStorage(
  settings: PlaybackSettings,
): PlaybackSettings {
  return normalizePlaybackSettings(settings);
}

export function isPlaybackRateInSupportedRange(playbackRate: number): boolean {
  return (
    Number.isFinite(playbackRate) &&
    playbackRate >= MIN_PLAYBACK_RATE &&
    playbackRate <= MAX_PLAYBACK_RATE
  );
}
