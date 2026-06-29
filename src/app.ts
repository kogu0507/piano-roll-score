import { mountLoadScreen } from "./ui/load-screen";
import { mountHorizontalScreen } from "./ui/horizontal-screen";
import { mountVerticalScreen } from "./ui/vertical-screen";
import { PlaybackController } from "./playback/playback-controller";
import { WebAudioMetronome } from "./audio/metronome";
import type { Song } from "./types/song";

export async function mountApp(
  root: HTMLElement,
  search = window.location.search,
  baseUrl = import.meta.env.BASE_URL,
): Promise<void> {
  function mountVerticalPreview(
    song: Song,
    returnToLoadScreen: () => void,
    playbackController = new PlaybackController(
      song,
      undefined,
      new WebAudioMetronome(),
    ),
  ): void {
    mountVerticalScreen(
      root,
      song,
      returnToLoadScreen,
      playbackController,
      () => {
        mountHorizontalPreview(song, returnToLoadScreen, playbackController);
      },
    );
  }

  function mountHorizontalPreview(
    song: Song,
    returnToLoadScreen: () => void,
    playbackController = new PlaybackController(
      song,
      undefined,
      new WebAudioMetronome(),
    ),
  ): void {
    mountHorizontalScreen(
      root,
      song,
      returnToLoadScreen,
      playbackController,
      () => {
        mountVerticalPreview(song, returnToLoadScreen, playbackController);
      },
    );
  }

  await mountLoadScreen(root, search, baseUrl, {
    onVerticalPreview: mountVerticalPreview,
    onHorizontalPreview: mountHorizontalPreview,
  });
}
