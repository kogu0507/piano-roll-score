import { mountLoadScreen } from "./ui/load-screen";
import { mountHorizontalScreen } from "./ui/horizontal-screen";
import { mountVerticalScreen } from "./ui/vertical-screen";
import { PlaybackController } from "./playback/playback-controller";
import { WebAudioMetronome } from "./audio/metronome";
import { getViewportOrientation } from "./core/app-settings";
import { createBrowserAppSettingsStore } from "./data/settings-storage";
import type { DisplayTextSettings } from "./core/app-settings";
import type { PlaybackState } from "./core/timeline";
import type { Song } from "./types/song";

export async function mountApp(
  root: HTMLElement,
  search = window.location.search,
  baseUrl = import.meta.env.BASE_URL,
): Promise<void> {
  const settingsStore = createBrowserAppSettingsStore();

  function createPlaybackController(song: Song): PlaybackController {
    const controller = new PlaybackController(
      song,
      undefined,
      new WebAudioMetronome(),
    );
    const { playback } = settingsStore.getSnapshot();

    controller.setPlaybackRate(playback.playbackRate);
    controller.setMetronomeEnabled(playback.metronomeEnabled);
    controller.setMetronomeVolume(playback.metronomeVolume);
    controller.setPrecountMeasures(playback.precountMeasures);
    return controller;
  }

  function savePlaybackSettings(state: PlaybackState): void {
    settingsStore.updatePlayback({
      playbackRate: state.playbackRate,
      metronomeEnabled: state.metronomeEnabled,
      metronomeVolume: state.metronomeVolume,
      precountMeasures: state.precountMeasures,
    });
  }

  function saveDisplayTextSettings(settings: DisplayTextSettings): void {
    settingsStore.updateDisplayText(settings);
  }

  function getCurrentOrientation() {
    return getViewportOrientation(window.innerWidth, window.innerHeight);
  }

  function mountVerticalPreview(
    song: Song,
    returnToLoadScreen: () => void,
    playbackController = createPlaybackController(song),
  ): void {
    const settingsSnapshot = settingsStore.getSnapshot();
    const initialSettings =
      settingsSnapshot.vertical[getCurrentOrientation()];

    mountVerticalScreen(
      root,
      song,
      returnToLoadScreen,
      playbackController,
      () => {
        mountHorizontalPreview(song, returnToLoadScreen, playbackController);
      },
      {
        initialSettings,
        displayTextSettings: settingsSnapshot.displayText,
        onSettingsChange: (settings) => {
          settingsStore.updateVertical(getCurrentOrientation(), settings);
        },
        onPlaybackSettingsChange: savePlaybackSettings,
        onDisplayTextSettingsChange: saveDisplayTextSettings,
      },
    );
  }

  function mountHorizontalPreview(
    song: Song,
    returnToLoadScreen: () => void,
    playbackController = createPlaybackController(song),
  ): void {
    const settingsSnapshot = settingsStore.getSnapshot();

    mountHorizontalScreen(
      root,
      song,
      returnToLoadScreen,
      playbackController,
      () => {
        mountVerticalPreview(song, returnToLoadScreen, playbackController);
      },
      {
        initialSettings: settingsSnapshot.horizontal,
        displayTextSettings: settingsSnapshot.displayText,
        onSettingsChange: (settings) => {
          settingsStore.updateHorizontal(settings);
        },
        onPlaybackSettingsChange: savePlaybackSettings,
        onDisplayTextSettingsChange: saveDisplayTextSettings,
      },
    );
  }

  await mountLoadScreen(root, search, baseUrl, {
    onVerticalPreview: mountVerticalPreview,
    onHorizontalPreview: mountHorizontalPreview,
  });
}
