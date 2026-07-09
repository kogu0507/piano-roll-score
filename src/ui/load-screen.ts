import {
  loadBuiltinSong,
  loadBuiltinSongIndex,
  type DataLoadError,
} from "../data/builtin-song-repository";
import {
  loadClassroomCatalog,
  loadClassroomCatalogSong,
  type LoadedClassroomCatalog,
  type LoadedClassroomCatalogSong,
} from "../data/classroom-catalog-repository";
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
import {
  getCatalogUrlFromSearch,
  getSongIdFromSearch,
} from "../data/song-query";
import { createSavedSongRepository } from "../data/saved-song-repository";
import {
  formatSavedSongTimestamp,
  type SavedSongSummary,
} from "../core/saved-song";
import { isBuiltinSongVisibleInHome } from "../schema/builtin-song-index-schema";
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
  selectedSongValue?: string;
}

interface LoadScreenElements {
  readonly main: HTMLElement;
  readonly status: HTMLParagraphElement;
  readonly songSelect: HTMLSelectElement;
  readonly songDetail: HTMLDivElement;
  readonly dataManagement: HTMLDetailsElement;
  readonly classroomCatalogUrlInput: HTMLInputElement;
  readonly classroomCatalogLoadButton: HTMLButtonElement;
  readonly classroomCatalogStatus: HTMLParagraphElement;
  readonly classroomCatalogResult: HTMLDivElement;
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
      "曲を選び、ピアノ表示またはスコア表示で練習できます。",
    ),
    status,
  );

  const startSection = document.createElement("section");
  const startHeading = createTextElement(
    "h2",
    "section-card__title",
    "曲選択",
  );
  const songSelectGroup = document.createElement("div");
  const songSelectLabel = createTextElement(
    "label",
    "song-select__label",
    "曲を選ぶ",
  );
  const songSelect = document.createElement("select");
  const startActions = document.createElement("div");
  const catalogLink = document.createElement("a");
  const verticalPreviewButton = createButton(
    "ピアノ表示",
    "button button--preview",
  );
  const horizontalPreviewButton = createButton(
    "スコア表示",
    "button button--horizontal-preview",
  );
  verticalPreviewButton.disabled = true;
  horizontalPreviewButton.disabled = true;

  startSection.className = "section-card section-card--start load-start-card";
  startSection.setAttribute("aria-labelledby", "song-select-heading");
  startHeading.id = "song-select-heading";
  songSelect.id = "song-select";
  songSelect.className = "song-select";
  songSelect.setAttribute("data-testid", "song-select");
  songSelectLabel.htmlFor = songSelect.id;
  songSelectGroup.className = "song-select-control";
  startActions.className = "load-start-actions";
  catalogLink.className = "button button--secondary button--catalog-link";
  catalogLink.href = "./catalog.html";
  catalogLink.textContent = "曲カタログ";
  catalogLink.setAttribute("data-testid", "catalog-link");
  songSelectGroup.append(songSelectLabel, songSelect);
  startActions.append(verticalPreviewButton, horizontalPreviewButton, catalogLink);
  startSection.append(
    startHeading,
    createTextElement(
      "p",
      "section-card__description",
      "サンプル曲と保存曲を選び、使う表示を選んで始めます。",
    ),
    songSelectGroup,
    startActions,
  );

  const songDetailSection = document.createElement("section");
  const songDetailHeading = createTextElement(
    "h2",
    "section-card__title",
    "曲の詳細",
  );
  const songDetail = document.createElement("div");
  songDetailSection.className =
    "section-card section-card--song-detail song-detail-card";
  songDetailSection.setAttribute("aria-labelledby", "song-detail-heading");
  songDetailHeading.id = "song-detail-heading";
  songDetail.className = "song-detail";
  songDetail.setAttribute("data-testid", "song-detail");
  songDetail.append(
    createTextElement(
      "p",
      "song-detail__empty",
      "曲を選ぶと、曲名や拍子などの詳細を表示します。",
    ),
  );
  songDetailSection.append(songDetailHeading, songDetail);

  const dataManagement = document.createElement("details");
  const dataManagementSummary = createTextElement(
    "summary",
    "data-management__summary",
    "データ管理",
  );
  const dataManagementContent = document.createElement("div");
  dataManagement.className = "section-card data-management";
  dataManagement.setAttribute("data-testid", "data-management");
  dataManagementContent.className = "data-management__content";
  dataManagement.append(dataManagementSummary, dataManagementContent);

  const classroomCatalogSection = document.createElement("section");
  const classroomCatalogHeading = createTextElement(
    "h2",
    "section-card__title",
    "教室カタログを読み込む",
  );
  const classroomCatalogDescription = createTextElement(
    "p",
    "section-card__description",
    "catalog.json のURLを入力して、教室・外部教材の一覧を確認します。教室コード入力は後段の機能です。",
  );
  const classroomCatalogForm = document.createElement("div");
  const classroomCatalogLabel = createTextElement(
    "label",
    "classroom-catalog__label",
    "catalog.json のURL",
  );
  const classroomCatalogUrlInput = document.createElement("input");
  const classroomCatalogLoadButton = createButton(
    "読み込む",
    "button button--primary",
  );
  const classroomCatalogStatus = createTextElement(
    "p",
    "classroom-catalog__status",
    "教室カタログはまだ読み込まれていません。",
  );
  const classroomCatalogResult = document.createElement("div");
  classroomCatalogSection.className =
    "section-card section-card--classroom-catalog classroom-catalog";
  classroomCatalogSection.setAttribute(
    "aria-labelledby",
    "classroom-catalog-heading",
  );
  classroomCatalogHeading.id = "classroom-catalog-heading";
  classroomCatalogForm.className = "classroom-catalog__form";
  classroomCatalogLabel.htmlFor = "classroom-catalog-url";
  classroomCatalogUrlInput.id = "classroom-catalog-url";
  classroomCatalogUrlInput.className = "classroom-catalog__url-input";
  classroomCatalogUrlInput.type = "text";
  classroomCatalogUrlInput.placeholder =
    "./data/classroom-catalogs/demo/catalog.json";
  classroomCatalogUrlInput.setAttribute("autocomplete", "url");
  classroomCatalogUrlInput.setAttribute(
    "data-testid",
    "classroom-catalog-url",
  );
  classroomCatalogLoadButton.setAttribute(
    "data-testid",
    "classroom-catalog-load",
  );
  classroomCatalogStatus.setAttribute(
    "data-testid",
    "classroom-catalog-status",
  );
  classroomCatalogStatus.setAttribute("aria-live", "polite");
  classroomCatalogResult.className = "classroom-catalog__result";
  classroomCatalogResult.setAttribute(
    "data-testid",
    "classroom-catalog-result",
  );
  classroomCatalogForm.append(
    classroomCatalogLabel,
    classroomCatalogUrlInput,
    classroomCatalogLoadButton,
  );
  classroomCatalogSection.append(
    classroomCatalogHeading,
    classroomCatalogDescription,
    classroomCatalogForm,
    classroomCatalogStatus,
    classroomCatalogResult,
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
  );
  editor.append(
    editorHeading,
    createTextElement(
      "p",
      "section-card__description",
      "直接編集できます。編集後は「JSONを確認」を押すと、練習画面へ進めます。",
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

  dataManagementContent.append(
    classroomCatalogSection,
    fileSection,
    savedSection,
    editor,
    resultSection,
  );
  content.append(startSection, songDetailSection, dataManagement);
  main.append(header, content);
  root.replaceChildren(main);

  return {
    main,
    status,
    songSelect,
    songDetail,
    dataManagement,
    classroomCatalogUrlInput,
    classroomCatalogLoadButton,
    classroomCatalogStatus,
    classroomCatalogResult,
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

function createSongDetail(song: Song): HTMLElement {
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
    ["音符数", `${song.notes.length}件`],
    ["表示音域", displayRange],
  ] as const;

  wrapper.className = "song-detail__content";
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
  let builtinIndex: BuiltinSongIndex | undefined;
  let savedSongSummaries: readonly SavedSongSummary[] = [];
  const showLoadScreen = (): void => {
    root.replaceChildren(elements.main);
    void refreshSavedSongs();
  };

  function syncSongSelectValue(): void {
    const selectedValue = state.selectedSongValue ?? "";
    const hasOption = Array.from(elements.songSelect.options).some(
      (option) => option.value === selectedValue,
    );

    elements.songSelect.value = hasOption ? selectedValue : "";
  }

  function renderSongSelect(): void {
    const placeholder = document.createElement("option");
    const sampleGroup = document.createElement("optgroup");
    const directGroup = document.createElement("optgroup");
    const savedGroup = document.createElement("optgroup");
    const selectedBuiltinId = state.selectedSongValue?.startsWith("builtin:")
      ? state.selectedSongValue.slice("builtin:".length)
      : undefined;

    placeholder.value = "";
    placeholder.textContent = "曲を選択してください";
    sampleGroup.label = "サンプル曲";
    directGroup.label = "直接指定された曲";
    savedGroup.label = "保存曲";

    (builtinIndex?.songs ?? [])
      .filter(isBuiltinSongVisibleInHome)
      .forEach((sample) => {
        const option = document.createElement("option");

        option.value = `builtin:${sample.id}`;
        option.textContent = `${sample.title}（${sample.level}）`;
        sampleGroup.append(option);
      });

    const selectedHiddenSample =
      selectedBuiltinId === undefined
        ? undefined
        : builtinIndex?.songs.find(
            (sample) =>
              sample.id === selectedBuiltinId &&
              !isBuiltinSongVisibleInHome(sample),
          );

    if (selectedHiddenSample !== undefined) {
      const option = document.createElement("option");

      option.value = `builtin:${selectedHiddenSample.id}`;
      option.textContent = `${selectedHiddenSample.title}（${selectedHiddenSample.level}）`;
      directGroup.append(option);
    }

    if (savedSongSummaries.length === 0) {
      const emptyOption = document.createElement("option");

      emptyOption.value = "";
      emptyOption.textContent = "保存曲はまだありません";
      emptyOption.disabled = true;
      savedGroup.append(emptyOption);
    } else {
      savedSongSummaries.forEach((summary) => {
        const option = document.createElement("option");

        option.value = `saved:${summary.id}`;
        option.textContent = `${summary.title}（更新: ${formatSavedSongTimestamp(
          summary.updatedAt,
        )}）`;
        savedGroup.append(option);
      });
    }

    elements.songSelect.replaceChildren(
      placeholder,
      sampleGroup,
      ...(selectedHiddenSample === undefined ? [] : [directGroup]),
      savedGroup,
    );
    syncSongSelectValue();
  }

  function setStatus(status: ScreenStatus, message: string): void {
    state.status = status;
    elements.status.textContent = message;
  }

  function showError(error: SongJsonError | DataLoadError): void {
    state.validatedSong = undefined;
    state.savedSongId = undefined;
    state.selectedSongValue = undefined;
    elements.verticalPreviewButton.disabled = true;
    elements.horizontalPreviewButton.disabled = true;
    setStatus("invalid", "入力内容を確認してください。");
    elements.songDetail.replaceChildren(createErrorDetails(error));
    elements.result.replaceChildren(createErrorDetails(error));
    renderSongSelect();
  }

  function showValidSong(song: Song): void {
    state.validatedSong = song;
    elements.verticalPreviewButton.disabled = false;
    elements.horizontalPreviewButton.disabled = false;
    setStatus("valid", "楽曲JSONを確認しました。");
    elements.songDetail.replaceChildren(createSongDetail(song));
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
      state.selectedSongValue =
        savedSongId !== undefined
          ? `saved:${savedSongId}`
          : updateUrlId === undefined
            ? undefined
            : `builtin:${updateUrlId}`;
      showValidSong(result.song);
    } else {
      elements.jsonInput.value = text;
      state.isDirty = false;
      state.savedSongId = undefined;
      state.selectedSongValue = undefined;
      showError(result.error);
    }

    if (updateUrlId === undefined) {
      removeSongIdFromUrl();
    } else {
      setSongIdInUrl(updateUrlId);
    }

    renderSongSelect();
    return result.success;
  }

  function setClassroomCatalogStatus(
    message: string,
    isError = false,
  ): void {
    elements.classroomCatalogStatus.textContent = message;
    elements.classroomCatalogStatus.classList.toggle("is-error", isError);
  }

  function renderClassroomCatalog(catalogData: LoadedClassroomCatalog): void {
    const wrapper = document.createElement("div");
    const heading = createTextElement(
      "h3",
      "classroom-catalog__loaded-title",
      `${catalogData.catalog.classroom.displayName} / ${catalogData.catalog.classroom.catalogName}`,
    );
    const meta = createTextElement(
      "p",
      "classroom-catalog__loaded-meta",
      catalogData.catalog.classroom.updatedAt === undefined
        ? "更新日は指定されていません。"
        : `更新日: ${catalogData.catalog.classroom.updatedAt}`,
    );
    const groups = new Map<string, LoadedClassroomCatalogSong[]>();

    catalogData.songs.forEach((song) => {
      const group = song.catalogGroup?.trim() || "未分類";
      const groupSongs = groups.get(group) ?? [];

      groupSongs.push(song);
      groups.set(group, groupSongs);
    });

    wrapper.className = "classroom-catalog__loaded";
    wrapper.append(heading, meta);

    groups.forEach((songs, groupName) => {
      const groupSection = document.createElement("section");
      const groupHeading = createTextElement(
        "h4",
        "classroom-catalog__group-title",
        groupName,
      );
      const list = document.createElement("div");

      groupSection.className = "classroom-catalog__group";
      list.className = "classroom-catalog__list";

      songs.forEach((song) => {
        const card = document.createElement("article");
        const body = document.createElement("div");
        const titleRow = document.createElement("div");
        const songId = createTextElement(
          "span",
          "classroom-catalog-card__id",
          song.id,
        );
        const title = createTextElement(
          "h5",
          "classroom-catalog-card__title",
          song.title,
        );
        const badges = document.createElement("div");
        const description = createTextElement(
          "p",
          "classroom-catalog-card__description",
          song.description?.trim() || "説明はありません。",
        );
        const actions = document.createElement("div");
        const openButton = createButton("開く", "button button--primary");

        card.className = "classroom-catalog-card";
        card.dataset.classroomSongId = song.id;
        card.setAttribute("data-testid", "classroom-catalog-song-card");
        body.className = "classroom-catalog-card__body";
        titleRow.className = "classroom-catalog-card__title-row";
        badges.className = "classroom-catalog-card__badges";
        actions.className = "classroom-catalog-card__actions";
        openButton.setAttribute("data-testid", "classroom-catalog-song-open");
        openButton.setAttribute("aria-label", `${song.title}を開く`);
        openButton.title = `${song.title}を開く`;
        openButton.addEventListener("click", () => {
          void loadExternalCatalogSong(song);
        });

        titleRow.append(songId, title);
        badges.append(
          createTextElement(
            "span",
            "classroom-catalog-card__badge",
            `グループ: ${groupName}`,
          ),
        );

        if (song.level !== undefined && song.level.trim().length > 0) {
          badges.append(
            createTextElement(
              "span",
              "classroom-catalog-card__badge",
              `level: ${song.level}`,
            ),
          );
        }

        body.append(titleRow, badges, description);
        actions.append(openButton);
        card.append(body, actions);
        list.append(card);
      });

      groupSection.append(groupHeading, list);
      wrapper.append(groupSection);
    });

    elements.classroomCatalogResult.replaceChildren(wrapper);
  }

  async function loadExternalCatalog(rawUrl: string): Promise<boolean> {
    setClassroomCatalogStatus("教室カタログを読み込んでいます。");
    elements.classroomCatalogResult.replaceChildren();
    elements.classroomCatalogLoadButton.disabled = true;

    const result = await loadClassroomCatalog(rawUrl, window.location.href);

    elements.classroomCatalogLoadButton.disabled = false;

    if (!result.success) {
      setClassroomCatalogStatus(result.error.message, true);
      elements.classroomCatalogResult.replaceChildren(
        createErrorDetails(result.error),
      );
      return false;
    }

    renderClassroomCatalog(result.data);
    setClassroomCatalogStatus(
      `「${result.data.catalog.classroom.displayName} / ${result.data.catalog.classroom.catalogName}」を読み込みました。`,
    );
    return true;
  }

  async function loadExternalCatalogSong(
    song: LoadedClassroomCatalogSong,
  ): Promise<boolean> {
    if (!shouldReplaceEditedContent(state, elements.jsonInput.value)) {
      return false;
    }

    state.validatedSong = undefined;
    state.savedSongId = undefined;
    state.selectedSongValue = undefined;
    elements.verticalPreviewButton.disabled = true;
    elements.horizontalPreviewButton.disabled = true;
    setStatus("loading", `「${song.title}」を読み込んでいます。`);
    setClassroomCatalogStatus(`「${song.title}」を読み込んでいます。`);

    const result = await loadClassroomCatalogSong(song);

    if (!result.success) {
      showError(result.error);
      setClassroomCatalogStatus(result.error.message, true);
      return false;
    }

    const didLoad = setLoadedText(formatSongJson(result.data));

    if (didLoad) {
      setClassroomCatalogStatus(`「${song.title}」を読み込みました。`);
    }

    return didLoad;
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
      savedSongSummaries = await savedSongRepository.list();
      renderSavedSongs(savedSongSummaries);
      renderSongSelect();
      setSavedSongStatus("保存一覧を更新しました。");
    } catch (error) {
      savedSongSummaries = [];
      renderSavedSongs([]);
      renderSongSelect();
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
      state.selectedSongValue = `saved:${record.id}`;
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

  async function loadSavedSong(id: string): Promise<boolean> {
    if (!shouldReplaceEditedContent(state, elements.jsonInput.value)) {
      syncSongSelectValue();
      return false;
    }

    setSavedSongStatus("保存済み楽曲を読み込んでいます。");

    try {
      const record = await savedSongRepository.get(id);

      if (record === undefined) {
        setSavedSongStatus(
          "保存データを読み込めませんでした。削除済み、または壊れている可能性があります。",
        );
        await refreshSavedSongs();
        return false;
      }

      setLoadedText(formatSongJson(record.song), undefined, record.id);
      setSavedSongStatus(`「${record.title}」を保存一覧から読み込みました。`);
      return true;
    } catch (error) {
      setSavedSongStatus(
        `読み込みに失敗しました: ${
          error instanceof Error ? error.message : "原因不明のエラー"
        }`,
      );
      syncSongSelectValue();
      return false;
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
        state.selectedSongValue = undefined;
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
  ): Promise<boolean> {
    if (
      requireConfirmation &&
      !shouldReplaceEditedContent(state, elements.jsonInput.value)
    ) {
      syncSongSelectValue();
      return false;
    }

    state.validatedSong = undefined;
    state.savedSongId = undefined;
    state.selectedSongValue = undefined;
    elements.verticalPreviewButton.disabled = true;
    elements.horizontalPreviewButton.disabled = true;
    setStatus("loading", `「${sample.title}」を読み込んでいます。`);
    const result = await loadBuiltinSong(baseUrl, sample.id);

    if (!result.success) {
      showError(result.error);
      syncSongSelectValue();
      return false;
    }

    return setLoadedText(formatSongJson(result.data), sample.id);
  }

  function renderSamples(index: BuiltinSongIndex): void {
    builtinIndex = index;
    renderSongSelect();
  }

  elements.jsonInput.addEventListener("input", () => {
    state.isDirty = true;
    state.validatedSong = undefined;
    state.savedSongId = undefined;
    state.selectedSongValue = undefined;
    elements.verticalPreviewButton.disabled = true;
    elements.horizontalPreviewButton.disabled = true;
    setStatus("editing", "編集中です。JSONを確認してください。");
    elements.songDetail.replaceChildren(
      createTextElement(
        "p",
        "song-detail__empty",
        "JSONを確認すると、曲の詳細を表示します。",
      ),
    );
    elements.result.replaceChildren(
      createTextElement(
        "p",
        "validation-result__pending",
        "現在の内容は未検証です。",
      ),
    );
    removeSongIdFromUrl();
    renderSongSelect();
  });

  elements.songSelect.addEventListener("change", () => {
    const selectedValue = elements.songSelect.value;

    if (selectedValue.startsWith("builtin:")) {
      const sampleId = selectedValue.slice("builtin:".length);
      const sample = builtinIndex?.songs.find(
        (candidate) => candidate.id === sampleId,
      );

      if (sample === undefined) {
        syncSongSelectValue();
        return;
      }

      void loadSample(sample, true);
      return;
    }

    if (selectedValue.startsWith("saved:")) {
      void loadSavedSong(selectedValue.slice("saved:".length));
      return;
    }

    state.selectedSongValue = undefined;
    renderSongSelect();
  });

  elements.classroomCatalogLoadButton.addEventListener("click", () => {
    void loadExternalCatalog(elements.classroomCatalogUrlInput.value);
  });

  elements.classroomCatalogUrlInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    void loadExternalCatalog(elements.classroomCatalogUrlInput.value);
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
    state.selectedSongValue = undefined;
    elements.verticalPreviewButton.disabled = true;
    elements.horizontalPreviewButton.disabled = true;
    setStatus("initial", "入力をクリアしました。");
    elements.songDetail.replaceChildren(
      createTextElement(
        "p",
        "song-detail__empty",
        "曲を選ぶと、曲名や拍子などの詳細を表示します。",
      ),
    );
    elements.result.replaceChildren();
    removeSongIdFromUrl();
    syncSongSelectValue();
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
      state.selectedSongValue = undefined;
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
  setStatus("initial", "曲を選んでください。");

  const idResult = getSongIdFromSearch(search);

  if (!idResult.success) {
    showError(idResult.error);
    return;
  }

  const catalogUrl = getCatalogUrlFromSearch(search);

  if (catalogUrl !== undefined) {
    elements.dataManagement.open = true;
    elements.classroomCatalogUrlInput.value = catalogUrl;
    await loadExternalCatalog(catalogUrl);
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
