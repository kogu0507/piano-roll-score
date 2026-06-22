import { mountLoadScreen } from "./ui/load-screen";
import { mountVerticalScreen } from "./ui/vertical-screen";

export async function mountApp(
  root: HTMLElement,
  search = window.location.search,
  baseUrl = import.meta.env.BASE_URL,
): Promise<void> {
  await mountLoadScreen(root, search, baseUrl, {
    onPreview: (song, returnToLoadScreen) => {
      mountVerticalScreen(root, song, returnToLoadScreen);
    },
  });
}
