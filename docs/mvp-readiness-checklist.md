# MVP readiness checklist

最終更新日: 2026年7月3日

この資料は、`spec.md` の「19. 完成条件」を第11段階完了時点の実装、テスト、手動確認結果と照合するための記録である。

## 判定区分

- **達成済み**: 実装が存在し、MVPの利用手順として成立している。
- **自動テストで確認済み**: Vitest、Playwright、ビルド、または設定ファイルで継続確認できる。
- **手動確認済み**: PC、Androidスマートフォン、Androidタブレット、Windowsタブレットなどでユーザー確認済み。
- **MVP対象外**: `spec.md` でMVPに含めない機能。
- **将来検討**: MVP後に、教室試用結果を見て優先順位を決める機能。
- **要注意**: MVP完成前または教室試用前に、仕様判断または追加確認が必要な事項。

## 1. `spec.md` 19. 完成条件の確認

| No. | 完成条件 | 判定 | 根拠 | 残る確認・対応 |
|---:|---|---|---|---|
| 1 | `npm install` 後に開発サーバーを起動できる | 達成済み / 自動テストで確認済み | Vite構成、npm scripts、Playwright global setupでViteサーバー起動を確認 | 新しい環境ではREADMEに従って `npm install` から確認する |
| 2 | 型検査、単体テスト、E2Eテスト、ビルドをnpmスクリプトから実行できる | 達成済み / 自動テストで確認済み | `npm.cmd run typecheck`、`test`、`test:e2e`、`build` を第10段階で実行 | なし |
| 3 | 静的ビルドを `/app/piano-roll-score/` 相当のサブパスへ配置して動作する | 達成済み / 自動テストで確認済み | `vite.config.ts` の `base: "/app/piano-roll-score/"`、Playwright baseURL `/app/piano-roll-score/`、ビルド成功、`dist/index.html` のassets参照確認 | 実ホスティング環境へ置く場合は `https://<ドメイン>/app/piano-roll-score/` で再確認する |
| 4 | ロード画面から内蔵サンプルを選択できる | 達成済み / 自動テストで確認済み | `tests/e2e/load-screen.spec.ts` | なし |
| 5 | `?id=001` で内蔵サンプルを直接開ける | 達成済み / 自動テストで確認済み | `tests/e2e/load-screen.spec.ts`、`vertical-screen.spec.ts`、`horizontal-screen.spec.ts` | なし |
| 6 | JSONの貼り付け、編集、検証ができる | 達成済み / 自動テストで確認済み | `tests/e2e/load-screen.spec.ts`、`tests/unit/song-json.test.ts` | なし |
| 7 | JSONファイルのインポートとエクスポートができる | 達成済み / 自動テストで確認済み | `tests/e2e/load-screen.spec.ts`、`tests/unit/import-export.test.ts` | なし |
| 8 | 楽曲を端末内へ保存し、再読み込みと削除ができる | 達成済み / 自動テストで確認済み / 手動確認済み | `tests/e2e/device-storage.spec.ts`、第8段階手動確認 | 端末ごとのブラウザ保存制限は教室試用時に注意する |
| 9 | 縦表示で音符ブロックが上から下へ流れる | 達成済み / 自動テストで確認済み / 手動確認済み | `tests/e2e/vertical-screen.spec.ts`、第6段階以降の手動確認 | なし |
| 10 | 縦表示で白鍵幅を調整できる | 達成済み / 自動テストで確認済み / 手動確認済み | `tests/e2e/vertical-screen.spec.ts`、`practice-layout-stage9-5.spec.ts`、実鍵盤確認 | なし |
| 11 | 縦表示で横位置を微調整できる | 達成済み / 自動テストで確認済み / 手動確認済み | Canvasドラッグと横位置スライダーのE2E、実鍵盤確認 | なし |
| 12 | 狭い課題音域だけを表示し、不要な広い余白を作らない | 達成済み / 自動テストで確認済み / 手動確認済み | 固定音域・自動音域の単体テスト、縦表示の手動確認 | 課題作成時は内蔵曲の `displayRange` を確認する |
| 13 | 白鍵と黒鍵が実鍵盤に近い相対位置で描画される | 達成済み / 自動テストで確認済み / 手動確認済み | `tests/unit/keyboard-geometry.test.ts`、実鍵盤確認 | なし |
| 14 | 横表示で音符ブロックが右から左へ流れる | 達成済み / 自動テストで確認済み / 手動確認済み | `tests/e2e/horizontal-screen.spec.ts`、第6段階以降の手動確認 | なし |
| 15 | 横表示で太めの5本線と補助グリッドが表示される | 達成済み / 自動テストで確認済み / 手動確認済み | `tests/unit/horizontal-layout.test.ts`、第5段階手動確認 | なし |
| 16 | ド♯とレ♭が縦表示では同じ鍵盤位置、横表示では異なる五線位置に表示される | 達成済み / 自動テストで確認済み / 手動確認済み | `tests/unit/vertical-layout.test.ts`、`horizontal-layout.test.ts`、第5段階手動確認 | なし |
| 17 | 音名と指番号の表示を切り替えられる | 達成済み / 自動テストで確認済み | 練習メニューの表示設定に、音名表示と指番号表示の個別ON/OFFを追加。`tests/unit/app-settings.test.ts` と `tests/e2e/settings-persistence.spec.ts` で、正規化、保存復元、縦表示・横表示への反映を確認 | 教室試用では、表示OFFが初心者や低年齢の利用者にとって見やすさを損なわないか確認する |
| 18 | スタート、一時停止、先頭に戻す、シークが動作する | 達成済み / 自動テストで確認済み / 手動確認済み | `tests/e2e/vertical-screen.spec.ts`、`horizontal-screen.spec.ts` | なし |
| 19 | 再生速度、プリカウント、メトロノームが動作する | 達成済み / 自動テストで確認済み / 手動確認済み | `tests/unit/metronome-timing.test.ts`、再生E2E、第7〜7.5段階手動確認 | iPhone SafariではWeb Audioの実機確認を推奨 |
| 20 | 表示方向を切り替えても同じ楽曲とタイムラインを使用する | 達成済み / 自動テストで確認済み / 手動確認済み | `tests/e2e/horizontal-screen.spec.ts`、第6段階手動確認 | なし |
| 21 | 不正なデータや不正なIDに対して、回復可能なエラー表示を行う | 達成済み / 自動テストで確認済み | `tests/e2e/load-screen.spec.ts`、`tests/unit/song-schema.test.ts` | なし |
| 22 | スマートフォン、タブレット、PCで主要操作が可能である | 達成済み / 自動テストで確認済み / 手動確認済み | `tests/e2e/responsive-stage9.spec.ts`、第9〜9.5段階手動確認 | iPhone Safariは未確認のため、可能なら早期確認する |
| 23 | 自動テストが成功する | 達成済み / 自動テストで確認済み | 第10.5段階で型検査、単体テスト、E2E、ビルド、`git diff --check` を実行 | なし |
| 24 | 実鍵盤との位置合わせ、音、操作感、教育的な見やすさについて手動確認を完了する | 手動確認済み / 要注意 | PC、Androidスマートフォン、Androidタブレット、Windowsタブレットで主要項目は確認済み | 先生・生徒を含む教室試用は未実施。`docs/manual-checklist-stage10.md` と `docs/classroom-trial-notes-template.md` で記録する |

## 2. MVP対象外・将来検討として維持するもの

次は `spec.md` 上もMVP対象外または将来検討であり、MVP公開準備では実装しない。

| 項目 | 区分 | 理由 |
|---|---|---|
| 音符に対応するピアノ音源再生 | MVP対象外 / 将来検討 | 教育実験では、まず視覚表示とメトロノームで効果を見る |
| 演奏判定、採点、ランキング | MVP対象外 / 将来検討 | 音楽ゲーム的な判定より、鍵盤位置理解と五線移行を優先する |
| マイク入力、MIDI入力 | MVP対象外 / 将来検討 | 入力機器やブラウザ権限の複雑さが大きい |
| 本格的な楽譜組版、複数譜表、大譜表 | MVP対象外 / 将来検討 | 横表示は五線への移行補助であり、正式な楽譜アプリではない |
| ユーザー登録、ログイン、クラウド同期、生徒管理 | MVP対象外 / 将来検討 | MVPはその端末・そのブラウザ内の保存に限定する |
| 外部データサーバー必須構成、合言葉アンロック | MVP対象外 / 将来検討 | 静的ホスティングで動くMVPを優先する |
| 教室での実測ログ自動収集 | MVP対象外 / 将来検討 | 個人情報、同意、保存期間、削除方法の設計が必要 |

## 3. 残るMVPリスク

1. **iPhone Safariの未確認**
   - 自動E2EはChromiumで実行している。
   - Android Chrome、PC、Androidタブレット、Windowsタブレットは確認済みだが、iPhone Safariの音とレイアウトは未確認。
   - 推奨案: 教室でiPhoneを使う可能性がある場合、早期に `?id=001`、再生、メトロノーム、表示調整、保存を確認する。

2. **教室での教育的有効性**
   - 実鍵盤との位置合わせや操作感は確認済みだが、先生・生徒が使ったときの教育的価値はこれから検証する。
   - 推奨案: `docs/classroom-trial-notes-template.md` に沿って、技術的不具合と教育上の改善を分けて記録する。
