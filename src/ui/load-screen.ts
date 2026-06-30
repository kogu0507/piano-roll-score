import {
  loadBuiltinSong,
  loadBuiltinSongIndex,
  type DataLoadError,
} from "../data/builtin-song-repository";
import {
  createSongFileName,
  createSongJsonBlob,
  readJsonFile,
  startBlobDownload,
} from "../data/import-export";
import {
  formatSongJson,
  getVisibleValidationIssues,
  parseAndValidateSongJson,
  type SongJsonError,
} from "../data/song-json";
import { getSongIdFromSearch } from "../data/song-query";
import { createSavedSongRepository } from "../data/saved-song-repository";
import {
  formatSavedSongTimestamp,
  type SavedSongSummary,
} from "../core/saved-song";
import type {
  BuiltinSongIndex,
  BuiltinSongSummary,
  Song,
} from "../types/song";

const APP_NAME = "piano-roll-score";

type ScreenStatus =
  | "initial"
  | "loading"
  | "editing"
  | "valid"
  | "invalid";

interface LoadScreenState {
  status: ScreenStatus;
  isDirty: boolean;
  validatedSong?: Song;
  savedSongId?: string;
}

interface LoadScreenElements {
  readonly main: HTMLElement;
  readonly status: HTMLParagraphElement;
  readonly sampleList: HTMLUListElement;
  readonly fileInput: HTMLInputElement;
  readonly jsonInput: HTMLTextAreaElement;
  readonly validateButton: HTMLButtonElement;
  readonly clearButton: HTMLButtonElement;
  readonly exportButton: HTMLButtonElement;
  readonly saveSongButton: HTMLButtonElement;
  readonly savedSongList: HTMLUListElement;
  readonly savedSongStatus: HTMLParagraphElement;
  readonly verticalPreviewButton: HTMLButtonElement;
  readonly horizontalPreviewButton: HTMLButtonElement;
  readonly result: HTMLDivElement;
}

export interface LoadScreenOptions {
  readonly onVerticalPreview?: (
    song: Song,
    returnToLoadScreen: () => void,
  ) => void;
  readonly onHorizontalPreview?: (
    song: Song,
    returnToLoadScreen: () => void,
  ) => void;
}

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

function createButton(text: string, className = "button"): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  return button;
}

function createLoadScreen(root: HTMLElement): LoadScreenElements {
  const main = document.createElement("main");
  const header = document.createElement("header");
  const content = document.createElement("div");
  const status = createTextElement(
    "p",
    "app-header__status",
    "内蔵サンプルを読み込んでいます。",
  );

  main.className = "app-shell";
  header.className = "app-header";
  content.className = "load-layout";

  header.append(
    createTextElement(
      "p",
      "app-header__eyebrow",
      "Piano learning experiment",
    ),
    createTextElement("h1", "app-header__title", APP_NAME),
    createTextElement(
      "p",
      "app-header__description",
      "楽曲JSONを読み込み、編集し、内容を確認できます。",
    ),
    status,
  );

  const samples = document.createElement("section");
  const sampleHeading = createTextElement(
    "h2",
    "section-card__title",
    "内蔵サンプル",
  );
  const sampleList = document.createElement("ul");
  samples.className = "section-card section-card--samples";
  samples.setAttribute("aria-labelledby", "sample-heading");
  sampleHeading.id = "sample-heading";
  sampleList.className = "sample-list";
  samples.append(
    sampleHeading,
    createTextElement(
      "p",
      "section-card__description",
      "サンプルを選ぶと、JSON欄へ読み込んで内容を確認します。",
    ),
    sampleList,
  );

  const fileSection = document.createElement("section");
  const fileHeading = createTextElement(
    "h2",
    "section-card__title",
    "JSONファイル読み込み",
  );
  const fileLabel = createTextElement(
    "label",
    "file-input__label",
    "JSONファイルを選択",
  );
  const fileInput = document.createElement("input");
  fileSection.className = "section-card";
  fileSection.setAttribute("aria-labelledby", "file-heading");
  fileHeading.id = "file-heading";
  fileInput.id = "json-file";
  fileInput.className = "file-input";
  fileInput.type = "file";
  fileInput.accept = ".json,application/json";
  fileLabel.htmlFor = fileInput.id;
  fileSection.append(
    fileHeading,
    createTextElement(
      "p",
      "section-card__description",
      "UTF-8の.jsonファイルを1件読み込みます。上限は2 MiBです。",
    ),
    fileLabel,
    fileInput,
  );

  const savedSection = document.createElement("section");
  const savedHeading = createTextElement(
    "h2",
    "section-card__title",
    "端末内保存",
  );
  const savedNotice = createTextElement(
    "p",
    "section-card__description saved-song-notice",
    "保存した楽曲はこの端末のこのブラウザ内だけに保存され、別端末には同期されません。重要なデータはJSON書き出しも使ってください。",
  );
  const savedSongList = document.createElement("ul");
  const savedSongStatus = createTextElement(
    "p",
    "saved-song-status",
    "保存一覧を確認しています。",
  );
  savedSection.className = "section-card section-card--saved";
  savedSection.setAttribute("aria-labelledby", "saved-heading");
  savedHeading.id = "saved-heading";
  savedSongList.className = "saved-song-list";
  savedSongList.setAttribute("data-testid", "saved-song-list");
  savedSongStatus.setAttribute("data-testid", "saved-song-status");
  savedSection.append(
    savedHeading,
    savedNotice,
    savedSongList,
    savedSongStatus,
  );

  const editor = document.createElement("section");
  const editorHeading = createTextElement(
    "h2",
    "section-card__title",
    "楽曲JSON編集",
  );
  const inputLabel = createTextElement(
    "label",
    "json-editor__label",
    "楽曲JSON",
  );
  const jsonInput = document.createElement("textarea");
  const actions = document.createElement("div");
  const validateButton = createButton("JSONを確認", "button button--primary");
  const clearButton = createButton("入力をクリア");
  const exportButton = createButton("JSONを書き出す");
  const saveSongButton = createButton("端末内に保存");
  const verticalPreviewButton = createButton(
    "縦表示を確認",
    "button button--preview",
  );
  const horizontalPreviewButton = createButton(
    "横表示を確認",
    "button button--horizontal-preview",
  );
  verticalPreviewButton.disabled = true;
  horizontalPreviewButton.disabled = true;

  editor.className = "section-card section-card--editor";
  editor.setAttribute("aria-labelledby", "editor-heading");
  editorHeading.id = "editor-heading";
  inputLabel.htmlFor = "song-json";
  jsonInput.id = "song-json";
  jsonInput.className = "json-editor";
  jsonInput.rows = 20;
  jsonInput.spellcheck = false;
  jsonInput.placeholder =
    "内蔵サンプルまたはJSONファイルを読み込むか、楽曲JSONを入力してください。";
  actions.className = "button-row";
  saveSongButton.setAttribute("data-testid", "save-song-button");
  actions.append(
    validateButton,
    clearButton,
    exportButton,
    saveSongButton,
    verticalPreviewButton,
    horizontalPreviewButton,
  );
  editor.append(
    editorHeading,
    createTextElement(
      "p",
      "section-card__description",
      "直接編集できます。編集後は「JSONを確認」を押してください。",
    ),
    inputLabel,
    jsonInput,
    actions,
  );

  const resultSection = document.createElement("section");
  const resultHeading = createTextElement(
    "h2",
    "section-card__title",
    "確認結果",
  );
  const result = document.createElement("div");
  resultSection.className = "section-card section-card--result";
  resultSection.setAttribute("aria-labelledby", "result-heading");
  resultHeading.id = "result-heading";
  result.className = "validation-result";
  result.setAttribute("aria-live", "polite");
  resultSection.append(resultHeading, result);

  content.append(samples, fileSection, savedSection, editor, resultSection);
  main.append(header, content);
  root.replaceChildren(main);

  return {
    main,
    status,
    sampleList,
    fileInput,
    jsonInput,
    validateButton,
    clearButton,
    exportButton,
    saveSongButton,
    savedSongList,
    savedSongStatus,
    verticalPreviewButton,
    horizontalPreviewButton,
    result,
  };
}

function createSummary(song: Song): HTMLElement {
  const wrapper = document.createElement("div");
  const facts = document.createElement("dl");
  const displayRange =
    song.displayRange.mode === "auto"
      ? "自動"
      : `固定（${song.displayRange.minPitch}～${song.displayRange.maxPitch}）`;
  const entries = [
    ["曲名", song.title],
    ["説明", song.description || "説明はありません。"],
    ["BPM", String(song.bpm)],
    [
      "拍子",
      `${song.timeSignature.numerator}/${song.timeSignature.denominator}`,
    ],
    ["音部記号", song.clef === "treble" ? "ト音記号" : "ヘ音記号"],
    ["音符数", `${song.notes.length}件`],
    ["表示音域", displayRange],
  ] as const;

  wrapper.className = "validation-success";
  wrapper.append(
    createTextElement("p", "validation-success__message", "JSONは有効です。"),
  );
  facts.className = "song-facts";

  entries.forEach(([term, value]) => {
    facts.append(
      createTextElement("dt", "song-facts__term", term),
      createTextElement("dd", "song-facts__value", value),
    );
  });

  wrapper.append(facts);
  return wrapper;
}

function createErrorDetails(error: SongJsonError | DataLoadError): HTMLElement {
  const wrapper = document.createElement("div");
  const message = createTextElement(
    "p",
    "validation-error__message",
    error.message,
  );
  const issues = "issues" in error ? (error.issues ?? []) : [];
  const visibleIssues = getVisibleValidationIssues(issues);

  wrapper.className = "validation-error";
  wrapper.setAttribute("role", "alert");
  wrapper.append(message);

  if (visibleIssues.visible.length > 0) {
    const list = document.createElement("ul");
    list.className = "validation-error__issues";

    visibleIssues.visible.forEach((issue) => {
      const item = document.createElement("li");
      const location = [
        issue.path || "データ全体",
        issue.noteId === undefined ? undefined : `音符ID: ${issue.noteId}`,
      ]
        .filter((value): value is string => value !== undefined)
        .join(" / ");

      item.append(
        createTextElement("strong", "validation-error__path", location),
        document.createTextNode(`: ${issue.message}`),
      );
      list.append(item);
    });

    wrapper.append(list);
  }

  if (visibleIssues.remainingCount > 0) {
    wrapper.append(
      createTextElement(
        "p",
        "validation-error__remaining",
        `ほかに${visibleIssues.remainingCount}件のエラーがあります。`,
      ),
    );
  }

  return wrapper;
}

function removeSongIdFromUrl(): void {
  const url = new URL(window.location.href);

  if (!url.searchParams.has("id")) {
    return;
  }

  url.searchParams.delete("id");
  window.history.replaceState(null, "", url);
}

function setSongIdInUrl(id: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("id", id);
  window.history.replaceState(null, "", url);
}

function shouldReplaceEditedContent(
  state: LoadScreenState,
  currentText: string,
): boolean {
  return (
    !state.isDirty ||
    currentText.trim().length === 0 ||
    window.confirm("編集中のJSONを破棄して置き換えますか？")
  );
}

export async function mountLoadScreen(
  root: HTMLElement,
  search = window.location.search,
  baseUrl = import.meta.env.BASE_URL,
  options: LoadScreenOptions = {},
): Promise<void> {
  const elements = createLoadScreen(root);
  const state: LoadScreenState = {
    status: "initial",
    isDirty: false,
  };
  const savedSongRepository = createSavedSongRepository();
  const showLoadScreen = (): void => {
    root.replaceChildren(elements.main);
    void refreshSavedSongs();
  };

  function setStatus(status: ScreenStatus, message: string): void {
    state.status = status;
    elements.status.textContent = message;
  }

  function showError(error: SongJsonError | DataLoadError): void {
    state.validatedSong = undefined;
    state.savedSongId = undefined;
    elements.verticalPreviewButton.disabled = true;
    elements.horizontalPreviewButton.disabled = true;
    setStatus("invalid", "入力内容を確認してください。");
    elements.result.replaceChildren(createErrorDetails(error));
  }

  function showValidSong(song: Song): void {
    state.validatedSong = song;
    elements.verticalPreviewButton.disabled = false;
    elements.horizontalPreviewButton.disabled = false;
    setStatus("valid", "楽曲JSONを確認しました。");
    elements.result.replaceChildren(createSummary(song));
  }

  function validateCurrentInput(): Song | undefined {
    const result = parseAndValidateSongJson(elements.jsonInput.value);

    if (!result.success) {
      showError(result.error);
      return undefined;
    }

    showValidSong(result.song);
    return result.song;
  }

  function setLoadedText(
    text: string,
    updateUrlId?: string,
    savedSongId?: string,
  ): boolean {
    const result = parseAndValidateSongJson(text);

    if (result.success) {
      elements.jsonInput.value = result.formattedJson;
      state.isDirty = false;
      state.savedSongId = savedSongId;
      showValidSong(result.song);
    } else {
      elements.jsonInput.value = text;
      state.isDirty = false;
      state.savedSongId = undefined;
      showError(result.error);
    }

    if (updateUrlId === undefined) {
      removeSongIdFromUrl();
    } else {
      setSongIdInUrl(updateUrlId);
    }

    return result.success;
  }

  function setSavedSongStatus(message: string): void {
    elements.savedSongStatus.textContent = message;
  }

  function renderSavedSongs(summaries: readonly SavedSongSummary[]): void {
    elements.savedSongList.replaceChildren();

    if (summaries.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "saved-song-empty";
      emptyItem.textContent = "保存された楽曲はまだありません。";
      elements.savedSongList.append(emptyItem);
      return;
    }

    summaries.forEach((summary) => {
      const item = document.createElement("li");
      const body = document.createElement("div");
      const title = createTextElement(
        "strong",
        "saved-song-item__title",
        summary.title,
      );
      const detail = createTextElement(
        "span",
        "saved-song-item__detail",
        `更新: ${formatSavedSongTimestamp(summary.updatedAt)}`,
      );
      const actions = document.createElement("div");
      const loadButton = createButton("読み込む", "button button--small");
      const deleteButton = createButton("削除", "button button--small");

      item.className = "saved-song-item";
      item.setAttribute("data-testid", "saved-song-item");
      item.dataset.savedSongId = summary.id;
      body.className = "saved-song-item__body";
      actions.className = "saved-song-item__actions";
      loadButton.setAttribute("data-testid", "saved-song-load");
      deleteButton.setAttribute("data-testid", "saved-song-delete");
      loadButton.addEventListener("click", () => {
        void loadSavedSong(summary.id);
      });
      deleteButton.addEventListener("click", () => {
        void deleteSavedSong(summary);
      });

      body.append(title, detail);
      actions.append(loadButton, deleteButton);
      item.append(body, actions);
      elements.savedSongList.append(item);
    });
  }

  async function refreshSavedSongs(): Promise<void> {
    try {
      renderSavedSongs(await savedSongRepository.list());
      setSavedSongStatus("保存一覧を更新しました。");
    } catch (error) {
      renderSavedSongs([]);
      setSavedSongStatus(
        `端末内保存を利用できません: ${
          error instanceof Error ? error.message : "原因不明のエラー"
        }`,
      );
    }
  }

  async function saveCurrentSong(): Promise<void> {
    const song = validateCurrentInput();

    if (song === undefined) {
      setSavedSongStatus("保存する前に、楽曲JSONのエラーを直してください。");
      return;
    }

    setSavedSongStatus("端末内へ保存しています。");

    try {
      const record = await savedSongRepository.save(song, state.savedSongId);
      state.savedSongId = record.id;
      state.isDirty = false;
      await refreshSavedSongs();
      setSavedSongStatus(
        `「${record.title}」を端末内へ保存しました。更新: ${formatSavedSongTimestamp(
          record.updatedAt,
        )}`,
      );
    } catch (error) {
      setSavedSongStatus(
        `保存に失敗しました: ${
          error instanceof Error ? error.message : "原因不明のエラー"
        }`,
      );
    }
  }

  async function loadSavedSong(id: string): Promise<void> {
    if (!shouldReplaceEditedContent(state, elements.jsonInput.value)) {
      return;
    }

    setSavedSongStatus("保存済み楽曲を読み込んでいます。");

    try {
      const record = await savedSongRepository.get(id);

      if (record === undefined) {
        setSavedSongStatus(
          "保存データを読み込めませんでした。削除済み、または壊れている可能性があります。",
        );
        await refreshSavedSongs();
        return;
      }

      setLoadedText(formatSongJson(record.song), undefined, record.id);
      setSavedSongStatus(`「${record.title}」を保存一覧から読み込みました。`);
    } catch (error) {
      setSavedSongStatus(
        `読み込みに失敗しました: ${
          error instanceof Error ? error.message : "原因不明のエラー"
        }`,
      );
    }
  }

  async function deleteSavedSong(summary: SavedSongSummary): Promise<void> {
    if (
      !window.confirm(
        `「${summary.title}」をこの端末内の保存一覧から削除しますか？`,
      )
    ) {
      setSavedSongStatus("削除をキャンセルしました。");
      return;
    }

    setSavedSongStatus("保存済み楽曲を削除しています。");

    try {
      await savedSongRepository.delete(summary.id);

      if (state.savedSongId === summary.id) {
        state.savedSongId = undefined;
      }

      await refreshSavedSongs();
      setSavedSongStatus(`「${summary.title}」を削除しました。`);
    } catch (error) {
      setSavedSongStatus(
        `削除に失敗しました: ${
          error instanceof Error ? error.message : "原因不明のエラー"
        }`,
      );
    }
  }

  async function loadSample(
    sample: BuiltinSongSummary,
    requireConfirmation: boolean,
  ): Promise<void> {
    if (
      requireConfirmation &&
      !shouldReplaceEditedContent(state, elements.jsonInput.value)
    ) {
      return;
    }

    state.validatedSong = undefined;
    state.savedSongId = undefined;
    elements.verticalPreviewButton.disabled = true;
    elements.horizontalPreviewButton.disabled = true;
    setStatus("loading", `「${sample.title}」を読み込んでいます。`);
    const result = await loadBuiltinSong(baseUrl, sample.id);

    if (!result.success) {
      showError(result.error);
      return;
    }

    setLoadedText(formatSongJson(result.data), sample.id);
  }

  function renderSamples(index: BuiltinSongIndex): void {
    elements.sampleList.replaceChildren();

    index.songs.forEach((sample) => {
      const item = document.createElement("li");
      const body = document.createElement("div");
      const button = createButton("JSON欄に読み込む", "button button--small");

      item.className = "sample-item";
      body.className = "sample-item__body";
      body.append(
        createTextElement("strong", "sample-item__title", sample.title),
        createTextElement(
          "span",
          "sample-item__detail",
          `${sample.level}・${sample.description}`,
        ),
      );
      button.setAttribute("aria-label", `${sample.title}をJSON欄に読み込む`);
      button.addEventListener("click", () => {
        void loadSample(sample, true);
      });
      item.append(body, button);
      elements.sampleList.append(item);
    });
  }

  elements.jsonInput.addEventListener("input", () => {
    state.isDirty = true;
    state.validatedSong = undefined;
    state.savedSongId = undefined;
    elements.verticalPreviewButton.disabled = true;
    elements.horizontalPreviewButton.disabled = true;
    setStatus("editing", "編集中です。JSONを確認してください。");
    elements.result.replaceChildren(
      createTextElement(
        "p",
        "validation-result__pending",
        "現在の内容は未検証です。",
      ),
    );
    removeSongIdFromUrl();
  });

  elements.validateButton.addEventListener("click", () => {
    validateCurrentInput();
  });

  elements.clearButton.addEventListener("click", () => {
    if (!shouldReplaceEditedContent(state, elements.jsonInput.value)) {
      return;
    }

    elements.jsonInput.value = "";
    state.isDirty = false;
    state.validatedSong = undefined;
    state.savedSongId = undefined;
    elements.verticalPreviewButton.disabled = true;
    elements.horizontalPreviewButton.disabled = true;
    setStatus("initial", "入力をクリアしました。");
    elements.result.replaceChildren();
    removeSongIdFromUrl();
  });

  elements.fileInput.addEventListener("change", () => {
    void (async () => {
      const file = elements.fileInput.files?.[0];
      elements.fileInput.value = "";

      if (file === undefined) {
        return;
      }

      if (!shouldReplaceEditedContent(state, elements.jsonInput.value)) {
        return;
      }

      state.validatedSong = undefined;
      state.savedSongId = undefined;
      elements.verticalPreviewButton.disabled = true;
      elements.horizontalPreviewButton.disabled = true;
      setStatus("loading", `${file.name}を読み込んでいます。`);
      const result = await readJsonFile(file);

      if (!result.success) {
        showError({
          kind: result.kind === "too-large" ? "too-large" : "json",
          message: result.message,
          issues: [],
        });
        return;
      }

      setLoadedText(result.text);
    })();
  });

  elements.exportButton.addEventListener("click", () => {
    const song = validateCurrentInput();

    if (song === undefined) {
      return;
    }

    startBlobDownload(createSongJsonBlob(song), createSongFileName(song));
  });

  elements.saveSongButton.addEventListener("click", () => {
    void saveCurrentSong();
  });

  elements.verticalPreviewButton.addEventListener("click", () => {
    if (
      state.validatedSong === undefined ||
      options.onVerticalPreview === undefined
    ) {
      return;
    }

    options.onVerticalPreview(state.validatedSong, showLoadScreen);
  });

  elements.horizontalPreviewButton.addEventListener("click", () => {
    if (
      state.validatedSong === undefined ||
      options.onHorizontalPreview === undefined
    ) {
      return;
    }

    options.onHorizontalPreview(state.validatedSong, showLoadScreen);
  });

  const indexResult = await loadBuiltinSongIndex(baseUrl);

  if (!indexResult.success) {
    showError(indexResult.error);
    return;
  }

  renderSamples(indexResult.data);
  await refreshSavedSongs();
  setStatus("initial", "入力方法を選んでください。");

  const idResult = getSongIdFromSearch(search);

  if (!idResult.success) {
    showError(idResult.error);
    return;
  }

  if (idResult.data === undefined) {
    return;
  }

  const sample = indexResult.data.songs.find(
    (candidate) => candidate.id === idResult.data,
  );

  if (sample === undefined) {
    showError({
      kind: "http",
      status: 404,
      message: "指定された内蔵曲が見つかりません。",
    });
    return;
  }

  await loadSample(sample, false);
}
