import { mountLoadScreen } from "./ui/load-screen";

export async function mountApp(
  root: HTMLElement,
  search = window.location.search,
  baseUrl = import.meta.env.BASE_URL,
): Promise<void> {
  await mountLoadScreen(root, search, baseUrl);
}
