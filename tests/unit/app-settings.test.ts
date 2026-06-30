import { describe, expect, test } from "vitest";

import {
  APP_SETTINGS_STORAGE_KEY,
  createAppSettingsStore,
  readAppSettings,
} from "../../src/data/settings-storage";
import {
  APP_SETTINGS_VERSION,
  MAX_STORED_VIEW_OFFSET,
  MIN_STORED_VIEW_OFFSET,
  getViewportOrientation,
  normalizeAppSettings,
} from "../../src/core/app-settings";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("app settings", () => {
  test("表示向き、表示設定、再生設定を正規化する", () => {
    expect(getViewportOrientation(390, 844)).toBe("portrait");
    expect(getViewportOrientation(844, 390)).toBe("landscape");

    const settings = normalizeAppSettings({
      version: APP_SETTINGS_VERSION,
      vertical: {
        portrait: {
          whiteKeyWidth: 999,
          horizontalOffset: -999_999,
          timeScale: 9,
        },
        landscape: {
          whiteKeyWidth: 8,
          horizontalOffset: 999_999,
          timeScale: 0.1,
        },
      },
      horizontal: {
        lineSpacing: 99,
        verticalOffset: 999_999,
        timeScale: 1.76,
      },
      playback: {
        playbackRate: 9,
        metronomeEnabled: true,
        metronomeVolume: 2,
        precountMeasures: 2,
      },
    });

    expect(settings.vertical.portrait).toEqual({
      whiteKeyWidth: 320,
      horizontalOffset: MIN_STORED_VIEW_OFFSET,
      timeScale: 2,
    });
    expect(settings.vertical.landscape).toEqual({
      whiteKeyWidth: 16,
      horizontalOffset: MAX_STORED_VIEW_OFFSET,
      timeScale: 0.5,
    });
    expect(settings.horizontal).toEqual({
      lineSpacing: 40,
      verticalOffset: MAX_STORED_VIEW_OFFSET,
      timeScale: 1.75,
    });
    expect(settings.playback).toEqual({
      playbackRate: 2,
      metronomeEnabled: true,
      metronomeVolume: 1,
      precountMeasures: 2,
    });
  });

  test("壊れたlocalStorage値は初期値へ戻す", () => {
    const storage = new MemoryStorage();
    storage.setItem(APP_SETTINGS_STORAGE_KEY, "{");

    const settings = readAppSettings(storage);

    expect(settings.version).toBe(APP_SETTINGS_VERSION);
    expect(settings.vertical).toEqual({});
    expect(settings.horizontal).toEqual({
      lineSpacing: 18,
      verticalOffset: 0,
      timeScale: 1,
    });
    expect(settings.playback).toEqual({
      playbackRate: 1,
      metronomeEnabled: false,
      metronomeVolume: 0.55,
      precountMeasures: 0,
    });
  });

  test("設定ストアで保存した値を読み戻せる", () => {
    const storage = new MemoryStorage();
    const store = createAppSettingsStore(storage);

    store.updateVertical("portrait", {
      whiteKeyWidth: 96,
      horizontalOffset: 12,
      timeScale: 1.25,
    });
    store.updateHorizontal({
      lineSpacing: 30,
      verticalOffset: -24,
      timeScale: 0.75,
    });
    store.updatePlayback({
      playbackRate: 1.5,
      metronomeEnabled: true,
      metronomeVolume: 0.35,
      precountMeasures: 1,
    });

    const settings = store.getSnapshot();

    expect(settings.vertical.portrait).toEqual({
      whiteKeyWidth: 96,
      horizontalOffset: 12,
      timeScale: 1.25,
    });
    expect(settings.horizontal).toEqual({
      lineSpacing: 30,
      verticalOffset: -24,
      timeScale: 0.75,
    });
    expect(settings.playback).toEqual({
      playbackRate: 1.5,
      metronomeEnabled: true,
      metronomeVolume: 0.35,
      precountMeasures: 1,
    });
  });
});
