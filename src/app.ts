import {
  loadBuiltinSong,
  loadBuiltinSongIndex,
  type DataLoadError,
} from "./data/builtin-song-repository";
import { getSongIdFromSearch } from "./data/song-query";
import type { BuiltinSongIndex, Song } from "./types/song";

export const APP_NAME = "piano-roll-score";

function createTextElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className: string,
  text: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function createSampleList(index: BuiltinSongIndex): HTMLElement {
  const section = document.createElement("section");
  const heading = createTextElement("h2", "sample-list__title", "内蔵サンプル");
  const list = document.createElement("ul");

  section.className = "sample-list";
  section.setAttribute("aria-labelledby", "sample-list-title");
  heading.id = "sample-list-title";
  list.className = "sample-list__items";

  index.songs.forEach((song) => {
    const item = document.createElement("li");
    const title = createTextElement("strong", "sample-list__name", song.title);
    const detail = createTextElement(
      "span",
      "sample-list__detail",
      `${song.level}・${song.description}`,
    );

    item.className = "sample-list__item";
    item.append(title, detail);
    list.append(item);
  });

  section.append(heading, list);
  return section;
}

function createSongSummary(song: Song): HTMLElement {
  const section = document.createElement("section");
  const heading = createTextElement("h2", "song-summary__title", song.title);
  const description = createTextElement(
    "p",
    "song-summary__description",
    song.description ?? "説明はありません。",
  );
  const facts = document.createElement("dl");
  const entries = [
    ["テンポ", `${song.bpm} BPM`],
    [
      "拍子",
      `${song.timeSignature.numerator}/${song.timeSignature.denominator}`,
    ],
    ["音符数", `${song.notes.length}件`],
  ] as const;

  section.className = "song-summary";
  section.setAttribute("aria-labelledby", "loaded-song-title");
  heading.id = "loaded-song-title";
  facts.className = "song-summary__facts";

  entries.forEach(([term, value]) => {
    facts.append(
      createTextElement("dt", "song-summary__term", term),
      createTextElement("dd", "song-summary__value", value),
    );
  });

  section.append(heading, description, facts);
  return section;
}

function createErrorMessage(error: DataLoadError): HTMLElement {
  const message = createTextElement("p", "load-panel__error", error.message);
  message.setAttribute("role", "alert");
  return message;
}

export async function mountApp(
  root: HTMLElement,
  search = window.location.search,
  baseUrl = import.meta.env.BASE_URL,
): Promise<void> {
  const main = document.createElement("main");
  const panel = document.createElement("section");
  const eyebrow = createTextElement(
    "p",
    "load-panel__eyebrow",
    "Piano learning experiment",
  );
  const heading = createTextElement("h1", "load-panel__title", APP_NAME);
  const message = createTextElement(
    "p",
    "load-panel__status",
    "内蔵サンプルを読み込んでいます。",
  );
  const content = document.createElement("div");

  main.className = "app-shell";
  panel.className = "load-panel";
  panel.setAttribute("aria-labelledby", "app-title");
  heading.id = "app-title";
  content.className = "load-panel__content";

  panel.append(eyebrow, heading, message, content);
  main.append(panel);
  root.replaceChildren(main);

  const indexResult = await loadBuiltinSongIndex(baseUrl);

  if (!indexResult.success) {
    message.textContent = "内蔵サンプルを読み込めませんでした。";
    content.append(createErrorMessage(indexResult.error));
    return;
  }

  message.textContent = "利用可能なサンプルを確認できます。";

  const idResult = getSongIdFromSearch(search);

  if (!idResult.success) {
    content.append(createErrorMessage(idResult.error));
  } else if (idResult.data !== undefined) {
    const isKnownId = indexResult.data.songs.some(
      (song) => song.id === idResult.data,
    );

    if (!isKnownId) {
      content.append(
        createErrorMessage({
          kind: "http",
          status: 404,
          message: "指定された内蔵曲が見つかりません。",
        }),
      );
    } else {
      const songResult = await loadBuiltinSong(baseUrl, idResult.data);

      if (songResult.success) {
        message.textContent = "内蔵サンプルを読み込みました。";
        content.append(createSongSummary(songResult.data));
      } else {
        content.append(createErrorMessage(songResult.error));
      }
    }
  }

  content.append(createSampleList(indexResult.data));
}
