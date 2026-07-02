import {
  APP_SETTINGS_VERSION,
  createDefaultAppSettings,
  normalizeAppSettings,
  normalizeDisplayTextSettings,
  normalizeHorizontalViewSettings,
  normalizePlaybackSettings,
  normalizeVerticalViewSettings,
  type AppSettings,
  type DisplayTextSettings,
  type HorizontalViewSettings,
  type PlaybackSettings,
  type VerticalViewSettings,
  type ViewOrientation,
} from "../core/app-settings";

export const APP_SETTINGS_STORAGE_KEY = "piano-roll-score:settings:v1";

export interface KeyValueStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface AppSettingsStore {
  getSnapshot: () => AppSettings;
  save: (settings: AppSettings) => void;
  updateVertical: (
    orientation: ViewOrientation,
    settings: VerticalViewSettings,
  ) => void;
  updateHorizontal: (settings: HorizontalViewSettings) => void;
  updatePlayback: (settings: PlaybackSettings) => void;
  updateDisplayText: (settings: DisplayTextSettings) => void;
}

export function readAppSettings(
  storage: KeyValueStorage | undefined,
): AppSettings {
  if (storage === undefined) {
    return createDefaultAppSettings();
  }

  try {
    const rawValue = storage.getItem(APP_SETTINGS_STORAGE_KEY);

    if (rawValue === null) {
      return createDefaultAppSettings();
    }

    return normalizeAppSettings(JSON.parse(rawValue) as unknown);
  } catch {
    return createDefaultAppSettings();
  }
}

export function writeAppSettings(
  storage: KeyValueStorage | undefined,
  settings: AppSettings,
): void {
  if (storage === undefined) {
    return;
  }

  const normalized = normalizeAppSettings({
    ...settings,
    version: APP_SETTINGS_VERSION,
  });

  try {
    storage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Storage can fail in private browsing or when quota is exhausted.
  }
}

export function createAppSettingsStore(
  storage: KeyValueStorage | undefined,
): AppSettingsStore {
  return {
    getSnapshot: () => readAppSettings(storage),
    save: (settings) => {
      writeAppSettings(storage, settings);
    },
    updateVertical: (orientation, settings) => {
      const current = readAppSettings(storage);
      writeAppSettings(storage, {
        ...current,
        vertical: {
          ...current.vertical,
          [orientation]: normalizeVerticalViewSettings(settings),
        },
      });
    },
    updateHorizontal: (settings) => {
      const current = readAppSettings(storage);
      writeAppSettings(storage, {
        ...current,
        horizontal: normalizeHorizontalViewSettings(settings),
      });
    },
    updatePlayback: (settings) => {
      const current = readAppSettings(storage);
      writeAppSettings(storage, {
        ...current,
        playback: normalizePlaybackSettings(settings),
      });
    },
    updateDisplayText: (settings) => {
      const current = readAppSettings(storage);
      writeAppSettings(storage, {
        ...current,
        displayText: normalizeDisplayTextSettings(settings),
      });
    },
  };
}

export function createBrowserAppSettingsStore(
  storage: KeyValueStorage | undefined =
    typeof window === "undefined" ? undefined : window.localStorage,
): AppSettingsStore {
  return createAppSettingsStore(storage);
}
