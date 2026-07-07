# piano-roll-score

ピアノ教室での試用を目的とした、ピアノ表示とスコア表示を切り替えられるピアノロール譜アプリである。

このプロジェクトは現在、第13段階「スコア表示ラベル左寄せ」まで完了している。MVP公開準備として自作ホームページのアプリディレクトリへ配置できる状態を整えたうえで、v0.2の改善としてピアノ表示とスコア表示の拍線・小節線、スコア表示の音名・指番号ラベル左寄せを追加した。PC、スマートフォン、Androidタブレット、Windowsタブレットで主要レイアウトの確認は完了している。音源再生、演奏判定、クラウド同期は後続段階またはMVP対象外で扱う。

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
  - 第11.5段階以降で出た将来改善案と、第12・第13段階で対応済みになった項目
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
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

開発サーバーは、既定では次のURLでアプリを提供する。

```text
http://localhost:5173/app/piano-roll-score/
```

`npm run generate:catalog` は `public/data/songs/index.json` から `public/catalog.html` を生成する。`npm run build` ではcatalog生成、型検査、Viteビルドを順に実行する。

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
- 次の作業: 公開URLでの確認、教室試用
- 音源再生、演奏判定、クラウド同期: 未実装またはMVP対象外
- 自動テスト環境: 構築済み
