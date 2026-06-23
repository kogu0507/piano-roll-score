import { mountLoadScreen } from "./ui/load-screen";
import { mountHorizontalScreen } from "./ui/horizontal-screen";
import { mountVerticalScreen } from "./ui/vertical-screen";
import type { Song } from "./types/song";

export async function mountApp(
  root: HTMLElement,
  search = window.location.search,
  baseUrl = import.meta.env.BASE_URL,
): Promise<void> {
  function mountVerticalPreview(
    song: Song,
    returnToLoadScreen: () => void,
  ): void {
    mountVerticalScreen(root, song, returnToLoadScreen, () => {
      mountHorizontalPreview(song, returnToLoadScreen);
    });
  }

  function mountHorizontalPreview(
    song: Song,
    returnToLoadScreen: () => void,
  ): void {
    mountHorizontalScreen(root, song, returnToLoadScreen, () => {
      mountVerticalPreview(song, returnToLoadScreen);
    });
  }

  await mountLoadScreen(root, search, baseUrl, {
    onVerticalPreview: mountVerticalPreview,
    onHorizontalPreview: mountHorizontalPreview,
  });
}
