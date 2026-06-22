export const APP_NAME = "piano-roll-score";

export interface AppStatus {
  readonly heading: string;
  readonly message: string;
}

export function getAppStatus(): AppStatus {
  return {
    heading: APP_NAME,
    message: "現在、開発基盤を構築中です。",
  };
}

export function mountApp(root: HTMLElement): void {
  const status = getAppStatus();
  const main = document.createElement("main");
  const panel = document.createElement("section");
  const eyebrow = document.createElement("p");
  const heading = document.createElement("h1");
  const message = document.createElement("p");
  const note = document.createElement("p");

  main.className = "app-shell";
  panel.className = "load-panel";
  panel.setAttribute("aria-labelledby", "app-title");

  eyebrow.className = "load-panel__eyebrow";
  eyebrow.textContent = "Piano learning experiment";

  heading.id = "app-title";
  heading.className = "load-panel__title";
  heading.textContent = status.heading;

  message.className = "load-panel__status";
  message.textContent = status.message;

  note.className = "load-panel__note";
  note.textContent =
    "楽曲の読み込みと譜面表示は、後続の実装段階で追加します。";

  panel.append(eyebrow, heading, message, note);
  main.append(panel);
  root.replaceChildren(main);
}
