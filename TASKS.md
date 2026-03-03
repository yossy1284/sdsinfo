# SDS 履修ガイドブック — タスク管理

## GitHub Pages サイト構築

- [x] `courses.csv` を 2026 年度版に更新
- [x] `courses.md` を 2026 年度版に更新
- [x] 変更履歴 (`changelog.md`, `README.md`) を作成
- [x] `courses.csv` と `courses.md` を同期
- [x] `courses.md` を廃止（`docs/courses.csv` に一本化）
- [x] GitHub Pages サイトを構築（HTML/CSS/JS）
  - [x] `index.html` — ページ構造・ナビゲーション
  - [x] `style.css` — デザイン・レスポンシブ対応
  - [x] `app.js` — CSV 読み込み・科目カード描画
  - [x] フィルタ・検索機能（カテゴリ/キーワード/学年）
  - [x] モーダル（科目詳細・成績分布グラフ）
  - [x] `guide.md` の読み込み・表示
- [x] GitHub Pages デプロイ
- [x] `docs/` フォルダにサイト関連ファイルを整理

## コンテンツ更新（今後）

- [x] `guide.md` を 2026 年度版に改訂（Web向けにリライト）
- [ ] 科目レビュー・コメントの追加・更新
- [ ] 授業アンケートの反映（難易度評価調整）
- [ ] 「2025年度情報」科目の 2026 年度情報への更新（開講日時・担当教員）

## 仕組み

- ルートの `courses.csv` / `guide.md` を編集 → push するだけでサイトに自動反映
- `docs/` 内のデータファイルはルートへのシンボリックリンク（同期不要）
- JavaScript がクライアント側で CSV を fetch してレンダリング
- ビルドステップ不要
