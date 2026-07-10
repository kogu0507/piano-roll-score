# piano-roll-score

ピアノ教室での試用を目的とした、ピアノ表示とスコア表示を切り替えられるピアノロール譜アプリである。

このプロジェクトは現在、第20段階「教室カタログ導線短縮と直接練習ボタン」まで実装済みである。MVP公開準備として自作ホームページのアプリディレクトリへ配置できる状態を整えたうえで、v0.2の改善としてピアノ表示とスコア表示の拍線・小節線、スコア表示の音名・指番号ラベル左寄せ、臨時記号付き音符の軽い自動強調、音符ブロック本体と手情報の低彩度化、`pickupBeats` と負の `note.time` によるアウフタクト表現、ホームに出す曲とカタログ専用曲の表示制御、スマートフォンでもPCでも読みやすい曲カタログの1列リストカードUI、外部/教室カタログ読み込み、教室コードによる教室カタログ入口、教室専用カタログの作成・検証CLI、教室カタログからの直接練習導線を追加した。音源再生、演奏判定、クラウド同期は後続段階またはMVP対象外で扱う。

## 目的

主に次の教育的仮説を検証する。

- 楽譜をまだ読めない初心者が、縦表示によって鍵盤と音の位置関係を理解しやすくなるか。
- ゲームに近い表示によって、子供がピアノへ触れる時間を増やせるか。
- 縦表示で練習した課題を横表示でも演奏することで、五線譜への移行を支援できるか。

演奏判定や本格的な楽譜組版は、MVPの対象外である。

## 重要な資料

作業前に次の資料を確認する。

- [AGENTS.md](AGENTS.md)
  - Codexおよび実装担当者向けの作業ルール
- [spec.md](spec.md)
  - 正式な製品仕様
- [docs/project-roadmap.md](docs/project-roadmap.md)
  - 全体の実装順序、現在の進捗、ユーザーの次の行動
- [docs/implementation-plan.md](docs/implementation-plan.md)
  - 現在の実装段階と完了条件
- [docs/deployment-guide.md](docs/deployment-guide.md)
  - MVPを自作ホームページへ配置する手順
- [docs/future-todos.md](docs/future-todos.md)
  - 第11.5段階以降で出た将来改善案と、第12〜第16.5段階で対応済みになった項目
- [docs/classroom-catalog-plan.md](docs/classroom-catalog-plan.md)
  - 教室コードで開く教室専用カタログ、著作権責任分界、将来の有料運用案
- [docs/classroom-catalog-operations.md](docs/classroom-catalog-operations.md)
  - 教室専用カタログを作成し、サイト側 `/data/` 配下へ配置する運用手順
- [docs/classroom-catalog-quickstart.md](docs/classroom-catalog-quickstart.md)
  - `kog` を例にした教室カタログ作成・検証・公開確認の短い手順
- [docs/classroom-catalog-terms-draft.html](docs/classroom-catalog-terms-draft.html)
  - 教室専用カタログを提供する場合の覚書・確認事項ドラフト
- [docs/manual-checklist-stage3.md](docs/manual-checklist-stage3.md)
  - 第3段階のユーザー向け画面確認手順
- [docs/manual-checklist-stage4.md](docs/manual-checklist-stage4.md)
  - 第4段階のユーザー向け画面確認手順
- [docs/manual-checklist-stage5.md](docs/manual-checklist-stage5.md)
  - 第5段階のユーザー向け画面確認手順
- [docs/manual-checklist-stage5-5.md](docs/manual-checklist-stage5-5.md)
  - 第5.5段階のユーザー向け画面確認手順
- [docs/manual-checklist-stage6.md](docs/manual-checklist-stage6.md)
  - 第6段階のユーザー向け画面確認手順
- [docs/manual-checklist-stage7.md](docs/manual-checklist-stage7.md)
  - 第7段階のユーザー向け画面確認手順
- [docs/manual-checklist-stage7-5.md](docs/manual-checklist-stage7-5.md)
  - 第7.5段階のユーザー向け画面確認手順
- [docs/manual-checklist-stage8.md](docs/manual-checklist-stage8.md)
  - 第8段階のユーザー向け画面確認手順
- [docs/manual-checklist-stage9.md](docs/manual-checklist-stage9.md)
  - 第9段階のユーザー向け画面確認手順
- [docs/manual-checklist-stage9-5.md](docs/manual-checklist-stage9-5.md)
  - 第9.5段階のユーザー向け画面確認手順
- [docs/manual-checklist-stage10.md](docs/manual-checklist-stage10.md)
  - 第10段階のMVP仕上げ・教室試用確認手順
- [docs/manual-checklist-stage16.md](docs/manual-checklist-stage16.md)
  - 第16〜16.5段階のカタログ導線、ホーム表示制御、スマートフォン向けカードUIの確認手順
- [docs/manual-checklist-stage18.md](docs/manual-checklist-stage18.md)
  - 第18段階の教室コード入力と教室カタログ画面の確認手順
- [docs/manual-checklist-stage19.md](docs/manual-checklist-stage19.md)
  - 第19段階の教室専用カタログ作成・配置ツールの確認手順
- [docs/manual-checklist-stage20.md](docs/manual-checklist-stage20.md)
  - 第20段階の教室カタログ導線短縮と直接練習ボタンの確認手順
- [docs/mvp-readiness-checklist.md](docs/mvp-readiness-checklist.md)
  - MVP完成条件の達成状況と残る要注意事項
- [docs/classroom-trial-notes-template.md](docs/classroom-trial-notes-template.md)
  - 教室試用時に先生やユーザーが記録するメモテンプレート
- [_spec.md](_spec.md)
  - 旧仕様書。正式な仕様としては使用しない

第3段階から第9.5段階までの手動確認資料は、各段階の確認履歴として残している。現行MVPの最終確認では、`docs/manual-checklist-stage10.md` と `docs/mvp-readiness-checklist.md` を優先する。

仕様に関する判断は `spec.md`、全体進行は `docs/project-roadmap.md`、現在の実装範囲は `docs/implementation-plan.md` を基準とする。

## 採用予定の技術

- Vite
- TypeScript
- HTML
- CSS
- Canvas 2D API
- Web Audio API
- Vitest
- Playwright
- Zod

React、Vue、SvelteなどのUIフレームワークは使用しない。

## 開発環境

現在のローカル環境では次を確認済み。

```text
Node.js v22.22.3
npm 10.9.8
```

Windows PowerShellでは実行ポリシーにより `npm` が起動できない場合がある。その場合は `npm.cmd` を使用する。

例:

```powershell
npm.cmd --version
```

## セットアップ

リポジトリのルートで依存関係をインストールする。

```text
npm install
```

Playwright用ブラウザが未導入の場合は、Chromiumをインストールする。

```text
npx playwright install chromium
```

Windows PowerShellで実行ポリシーにより `npm` や `npx` が起動できない場合は、`npm.cmd` または `npx.cmd` を使用する。

## 開発コマンド

次のnpmスクリプトを利用できる。

```text
npm run dev
npm run generate:catalog
npm run classroom:hash -- <教室コード>
npm run classroom:scaffold -- --code <教室コード> --name <教室名> --catalog <カタログ名> --out <出力先>
npm run classroom:validate -- <catalog.json>
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

開発サーバーは、既定では次のURLでアプリを提供する。

```text
http://localhost:5173/app/piano-roll-score/
```

`npm run generate:catalog` は `public/data/songs/index.json` から `public/catalog.html` を生成する。`index.json` の `visibleInHome` はホーム画面の曲選択への表示、`catalogGroup` は曲カタログ上の分類に使う。曲カタログは端末幅にかかわらず1列のリストカードとして表示し、PCやタブレットではカード内の情報と「開く」操作を横長に配置する。`npm run build` ではcatalog生成、型検査、Viteビルドを順に実行する。

`npm run classroom:hash`、`npm run classroom:scaffold`、`npm run classroom:validate` は、教室専用カタログをサイト側 `/data/piano-roll-score/classroom-catalogs/{catalogKey}/` に作成・検証する運用補助CLIである。実データや顧客データはリポジトリへ入れず、詳しい手順は `docs/classroom-catalog-operations.md` を参照する。

`npm run test` はVitestの単体テスト、`npm run test:e2e` はPlaywrightのデスクトップ幅・スマートフォン幅のスモークテストを実行する。

## 配置方針

アプリは静的ビルドとして、次のようなサブパスへ配置することを想定する。

```text
https://example.com/app/piano-roll-score/
```

共有サンプルはアプリに同梱し、次のようなURLから開ける構成を予定している。

```text
https://example.com/app/piano-roll-score/?id=001
```

曲IDと曲名の対応は、次の曲一覧ページでも確認できる。

```text
https://example.com/app/piano-roll-score/catalog.html
```

専用のアプリケーションサーバーを必要としない構成をMVPの前提とする。
具体的な公開手順とキャッシュ上の注意は [docs/deployment-guide.md](docs/deployment-guide.md) を参照する。

## 進行方法

- 設計スレッドで、仕様、優先順位、共有資料を管理する。
- 実装スレッドは、既存資料を読んでから `docs/implementation-plan.md` の範囲を実装する。
- ユーザーが次に行うことは `docs/project-roadmap.md` と設計スレッドの案内で確認する。
- 実装中に仕様上の問題を発見した場合は、独断で仕様を変更せず、問題点と推奨案を設計スレッドへ返す。
- 合意した仕様変更は、会話だけでなく `spec.md` へ反映する。

## 現在の状態

- 正式仕様書: 作成済み
- Codex向け作業ルール: 作成済み
- 初期実装計画: 作成済み
- Viteプロジェクト: 構築済み
- 第1段階 開発基盤: 完了
- 第2段階 楽曲スキーマと内蔵データ読み込み: 完了
- 第3段階 ロード画面とJSON入出力: 完了
- 第4段階 縦表示の静的描画: 完了
- 第5段階 横表示の静的描画: 完了
- 第5.5段階 横表示の表示調整: 完了
- 第6段階 共通タイムラインと再生: 完了
- 第7段階 メトロノームとプリカウント: 完了
- 第7.5段階 再生ガイドと助走表示: 完了
- 第8段階 端末内保存と設定保存: 完了
- 第9段階 レスポンシブ対応と操作性調整: 実装済み
- 第9.5段階 練習画面レイアウト再設計: 完了
- 第10段階 教室での手動検証とMVP仕上げ: 完了
- 第10.5段階 入口と練習画面ナビゲーション整理: 完了
- 第11段階 公開準備: 完了
- 第11.5段階 サンプル曲追加と曲一覧ページ生成: 完了
- 第12段階 拍線・小節線: 完了
- 第13段階 スコア表示ラベル左寄せ: 完了
- 第14段階 臨時記号付き音符の自動強調: 完了
- 第14.5段階 音符ブロックの視覚ルール整理: 完了
- 第15段階 アウフタクト対応: 完了
- 第16段階 カタログ導線とホーム表示制御: 完了
- 第16.5段階 カタログのスマートフォン向けカードUI改善: 完了
- 第17段階 外部/教室カタログ読み込み基盤: 完了
- 第18段階 教室コード入力と教室カタログ画面の入口: 実装済み
- 第19段階 教室専用カタログ作成・配置ツール: 実装済み
- 第20段階 教室カタログ導線短縮と直接練習ボタン: 実装済み
- 次の作業: 実際の教室コード、教材JSON、ローカル公開用 `/public_html/data/...` 配置での運用確認と教室利用時の導線確認
- 音源再生、演奏判定、クラウド同期: 未実装またはMVP対象外
- 自動テスト環境: 構築済み
## 第17段階メモ: 外部/教室カタログ読み込み

第17段階では、ホーム画面の「データ管理」内から任意の `catalog.json` URLを読み込む基盤を追加した。

- 開発確認用カタログ: `public/data/classroom-catalogs/demo/catalog.json`
- URLパラメータ例: `?catalog=./data/classroom-catalogs/demo/catalog.json`
- カタログ内の `songUrl` は、カタログJSONのURLを基準に相対解決する。
- 外部カタログ内の曲JSONも既存の楽曲スキーマ検証を通し、検証後は既存のピアノ表示・スコア表示へ進める。
- `javascript:`、`data:`、`file:` など危険なURLは拒否する。

## 第18段階メモ: 教室コード入力と教室カタログ画面

第18段階では、教室コードを入力し、アプリ内で正規化・SHA-256ハッシュ化して教室カタログURLを作れるようにした。第20段階以降、教室コード入力はホーム画面上部の主導線へ移し、`catalog.json` URL直接入力はデータ管理内の確認用導線として残している。

- 本番想定URL: `/data/piano-roll-score/classroom-catalogs/{hash}/catalog.json`
- 開発確認用コード: `demo`
- `demo` だけはアプリ同梱の `data/classroom-catalogs/demo/catalog.json` へマップする。
- URLパラメータ例: `?classroom=demo`
- `?classroom=demo` などで開いた場合は、教室名、カタログ名、更新日、グループ別カードを持つ教室カタログ画面を主役表示にする。
- 教室カタログの曲カードには、曲JSONを確認する導線とは別に、直接「ピアノ表示」「スコア表示」へ進む練習ボタンを置く。

教室コードはログイン認証ではなく、コードを知っている人が教材カタログへ到達しやすくする簡易導線である。ログイン、サーバー認証、クラウド同期、先生用管理画面、教室コード履歴保存は未実装であり、後段の検討対象である。

## 第19段階メモ: 教室専用カタログ作成・配置ツール

第19段階では、運営側が教室専用カタログを安全に作るためのCLIと運用手順を追加した。

- `npm run classroom:hash -- <教室コード>` で正規化済みコード、catalogKey、配置URLパスを確認する。
- `npm run classroom:scaffold -- --code ... --name ... --catalog ... --out ...` で `{catalogKey}/catalog.json` と `songs/README.md` の雛形を作る。
- `npm run classroom:validate -- <catalog.json>` で教室カタログと同一フォルダ配下の曲JSONを検証する。
- 空の `songs: []` は、運用開始前の雛形として有効にした。
- 本番教室データはアプリ本体の `public/` ではなく、サイト側 `/data/piano-roll-score/classroom-catalogs/{catalogKey}/` に置く。

教室コードは認証ではない。秘密情報、個人情報、権利確認が取れていない教材は置かず、問題発生時は該当 `{catalogKey}` フォルダを停止または退避する。
