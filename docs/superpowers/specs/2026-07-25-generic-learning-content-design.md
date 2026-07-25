# Learnscape 汎用学習コンテンツ化 設計ドキュメント

- 日付: 2026-07-25
- ステータス: 設計承認待ち
- 対象リポジトリ: [wikeda/Learnscape](https://github.com/wikeda/Learnscape)（`world-history-quiz` を基に作成）
- 関連: 元アプリ設計 `docs/superpowers/specs/2026-07-23-world-history-quiz-design.md`

## 1. 目的・背景

世界史専用だった学習アプリ（フォーク元 `world-history-quiz`）を、**任意の学習コンテンツをJSONで読み込んで学習できる汎用学習アプリ**に拡張する。UI構造・学習体験（フラッシュカードのスワイプ判定・段階的鮮明化）は現状を維持し、「コンテンツ」という概念を新たに導入する。

初期搭載として、大学入試向けの **日本史（1500問・7区分30章）** と **世界史（2100問・8区分40章）** の2コンテンツを同梱する。既存のCSV版世界史（簡易版）は廃止し、Excel由来の世界史に置換する。

### スコープ外（YAGNI）
- 選択式問題の「選択UI」実装（選択肢は表示のみ、判定は従来どおりスワイプ自己採点）
- 難度・形式による絞り込み機能（データは保持するが、絞り込みUIは今回作らない）
- コンテンツのクラウド同期・共有（ローカルのlocalStorageのみ）
- 旧スキーマからのデータ移行（Learnscapeは新規デプロイのため利用者ゼロ）

## 2. 要件

| # | 要件 |
|---|---|
| R1 | 質問（JSON形式）を読み込ませ、複数の学習コンテンツを1つのアプリで学習できる |
| R2 | UI構造・学習体験は基本的に現状維持 |
| R3 | コンテンツ読み込みは「設定画面」に機能として搭載（ファイル選択方式） |
| R4 | JSON形式は既存の問題データ＋コンテンツタイトル＋区分（時代区分）等を加えた形 |
| R5 | コンテンツタイトルがTOP画面に反映される（例：日本史／世界史） |
| R6 | TOP画面の名称は「コンテンツタイトル + 実績マップ」（例：日本史 実績マップ） |
| R7 | コンテンツは「区分 ＞ 章」の2階層構造を持つ |
| R8 | 実績画面では現状と同じく章単位でタイル化して表示（区分ごとに grouping） |
| R9 | コンテンツの変更はTOP画面のタイトルクリック（モーダル）で行う |

## 3. コンテンツJSON形式（スキーマ v1）

1ファイル = 1コンテンツ。

```json
{
  "schemaVersion": 1,
  "id": "japanese-history",
  "title": "日本史",
  "questions": [
    {
      "id": "JH0001",
      "section": "原始",
      "chapter": "旧石器・縄文時代",
      "chapterNo": 1,
      "difficulty": "基礎",
      "format": "用語記述",
      "question": "次の説明に該当する最も適切な語句・人物名・事件名を答えなさい。\n「群馬県で相沢忠洋が発見し、日本列島にも旧石器文化が存在したことを示した遺跡」",
      "choices": null,
      "answer": "岩宿遺跡",
      "explanation": "岩宿遺跡は、群馬県で相沢忠洋が発見し、日本列島にも旧石器文化が存在したことを示した遺跡。",
      "point": "岩宿遺跡と、その役割・内容を一体で覚える。"
    }
  ]
}
```

### フィールド定義

| フィールド | 型 | 必須 | 由来（Excel） | 用途 |
|---|---|:--:|---|---|
| `schemaVersion` | number | ✅ | — | 形式のバージョン（現在 1） |
| `id` | string | ✅ | 初期搭載は変換時に付与/インポートはファイル内で指定 | コンテンツ識別・進捗の紐付けキー |
| `title` | string | ✅ | はじめに/ファイル名 | TOP画面「〇〇 実績マップ」表示 |
| `questions[]` | array | ✅ | 問題/解答・解説シート | 問題配列 |
| `questions[].id` | string | ✅ | 問題ID | 進捗キー（コンテンツ内で一意） |
| `questions[].section` | string | ✅ | 時代区分 | **区分**（階層の上位・grouping見出し） |
| `questions[].chapter` | string | ✅ | 章名 | **章**（タイル1枚＝1章） |
| `questions[].chapterNo` | number | ✅ | 章番号 | 章の並び順 |
| `questions[].difficulty` | string | 任意 | 難度 | 保持（将来の絞り込み用） |
| `questions[].format` | string | 任意 | 形式 | 保持（将来の絞り込み用） |
| `questions[].question` | string | ✅ | 問題文 | カード上部（常時表示） |
| `questions[].choices` | string \| null | 任意 | 選択肢 | カード上部に併記（選択式のみ） |
| `questions[].answer` | string | ✅ | 正解 | カード下部（段階1で鮮明化） |
| `questions[].explanation` | string \| null | 任意 | 解説 | カード下部（段階2で鮮明化） |
| `questions[].point` | string \| null | 任意 | 学習ポイント | カード下部（段階2で鮮明化） |

### バリデーション規則（インポート時）
- `schemaVersion` が既知（=1）であること
- `id`・`title` が非空文字列であること
- `questions` が1件以上の配列であること
- 各問題で必須フィールド（`id`,`section`,`chapter`,`chapterNo`,`question`,`answer`）が揃っていること
- `questions[].id` がコンテンツ内で重複しないこと
- 違反時は具体的なエラーメッセージを設定画面に表示し、保存しない

## 4. データモデル / ストレージ（アプリ内スキーマ v2）

### 4.1 型（`src/domain/types.ts` 拡張）

```ts
// 新規
export interface Question {
  id: string;          // 例 "JH0001"（旧: no: number）
  section: string;     // 区分
  chapter: string;     // 章
  chapterNo: number;
  difficulty?: string;
  format?: string;
  question: string;
  choices?: string | null;
  answer: string;
  explanation?: string | null;
  point?: string | null;
}

export interface Content {
  id: string;
  title: string;
  builtin: boolean;    // 初期搭載=true（削除不可）
  questions: Question[];
}

// 進捗はコンテンツ別にネスト
export interface ContentProgress {
  progress: Record<string, QuestionProgress>;   // key: question.id
  chapterRounds: Record<string, RoundRecord[]>;  // key: chapter名
}

export interface AppData {
  version: number;                               // = 2
  activeContentId: string;
  importedContents: Content[];                   // インポート分のみ保存（初期搭載は同梱JSONから読む）
  byContent: Record<string, ContentProgress>;    // key: content.id
  streak: Streak;                                // ストリークは全コンテンツ横断で継続
  settings: Settings;
}
```

- `QuestionProgress.no: number` → `id: string` に変更
- ストリークはアプリ全体で1本（コンテンツをまたいでも学習継続と見なす）

### 4.2 コンテンツの供給
- **初期搭載**: `src/data/contents/japanese-history.json`, `src/data/contents/world-history.json` をビルド時同梱。`builtin: true`
- **インポート**: 設定画面で読み込んだJSONを `AppData.importedContents` に保存（localStorage）
- 実行時のコンテンツ一覧 = 初期搭載（同梱JSON）＋ `importedContents`
- 同一 `id` のインポートは既存を上書き（再インポートでの更新を許容）。ただし初期搭載 `id` と衝突する場合はインポートを拒否

### 4.3 進捗の分離
- `progress` / `chapterRounds` を `byContent[contentId]` の下にネスト
- 学習・集計・結果画面はすべて「アクティブなコンテンツ」の `ContentProgress` を参照
- 初回にコンテンツを開いた時点で当該 `ContentProgress` を空で初期化

## 5. 初期搭載コンテンツの生成

- 変換スクリプト（`scripts/build-contents.mjs`、既存 `build-questions.mjs` を置換）を用意
- 入力: Excel（`問題`＋`解答・解説`シートを問題IDで結合、`章構成`シートで区分＞章の順序を取得）
- 出力: 上記JSON形式を `src/data/contents/*.json` に生成
- `npm run contents` で再生成可能に（`package.json` scripts 更新）
- Excelの各形式（用語記述／年代選択／正誤／説明選択／年代整序）はいずれも「問題文（＋選択肢）→ 正解＋解説」に素直に写像。選択肢は選択式形式のみ `choices` に格納、記述式は `null`

## 6. 画面設計（構造は現状維持）

### 6.1 ホーム画面（実績マップ）
- 見出しを「**{activeContent.title} 実績マップ**」に変更
- 見出し（タイトル）を**タップ可能**にし、タップで**コンテンツ選択モーダル**を開く（タップ可能であることが分かる装飾：`▾` 等）
- 章タイルは現状どおり章単位。ただし**区分（section）ごとにセクション見出し**を挟んで grouping 表示
  - 区分・章の並び順は `chapterNo` 昇順（＝Excel `章構成` の順序）

### 6.2 コンテンツ選択モーダル
- 搭載済みコンテンツ一覧（タイトル＋問題数など）を表示し、選択で `activeContentId` を切替
- インポート分は削除操作を提供（初期搭載は削除不可）
- 現状のタブ構成を崩さないためモーダルで実装

### 6.3 設定画面
- 「**コンテンツを読み込む**」セクションを追加
- **ファイル選択**（`<input type="file" accept="application/json,.json">`）でJSONを読み込む
- 読み込み→§3のバリデーション→合格で `importedContents` に保存、失敗で具体的エラー表示
- 読み込み済みコンテンツの一覧・削除も設定画面から可能（モーダルと機能重複する場合は片方に集約）

### 6.4 学習画面（フラッシュカード）
- カードは1面のまま。**段階的鮮明化（↓スワイプ）を2段階化**:
  - 上部（常時表示・ぼかしなし）: `question`（＋ `choices` があれば併記）
  - 下部（段階的アンブラー）:
    - **段階1**: `answer`（大・accent）
    - **段階2**: `explanation` / `point`（小）
  - `reveal`(0..1) を分割し、前半で `answer`、後半で `explanation`/`point` を鮮明化
  - キーボード: ↓1回目で `answer` まで、2回目で全表示（`explanation`/`point`）
- スワイプ判定（右=覚えた／上=あやふや／左=できなかった）とマスタリー更新ロジックは**不変**

## 7. 影響範囲（既存コードの追随）

`no: number` → `id: string`、単一コンテンツ → アクティブコンテンツ参照への変更に伴い、以下を更新:

- `src/domain/types.ts`（型変更）
- `src/domain/aggregate.ts`（集計。`chapterList`→区分>章の構造取得を追加）
- `src/domain/mastery.ts` / `session.ts` / `streak.ts`（`no`→`id`）
- `src/hooks/useQuestions.ts`（アクティブコンテンツの問題を返す）
- `src/state/AppDataContext.tsx`（コンテンツ別進捗・アクティブID・インポート管理）
- `src/storage/schema.ts` / `storage.ts`（スキーマv2、`defaultAppData`）
- 画面: `HomeScreen`, `StudyScreen`, `SettingsScreen`, `ResultScreen`, `StatsScreen`, `ChapterDetailScreen`, `QuestionListScreen`
- コンポーネント: `Flashcard`（2段階鮮明化・選択肢併記）

## 8. テスト方針

- 既存 vitest 構成に倣う
- 追加: JSONバリデーション、区分>章の構造取得、コンテンツ別進捗の分離、Excel→JSON変換の要点
- 更新: `aggregate.test.ts`, `mastery.test.ts`, `session.test.ts` などを `no→id`・コンテンツ別構造に追随
- 既存の学習体験（スワイプ判定・鮮明化）に対する振る舞いを崩していないことを確認

## 9. 非対応/留意点

- 旧 `world-history-quiz`（CSV版）からのデータ移行は行わない（新規デプロイのため）
- 歴史用語・年代には教科書間の表記差があり、コンテンツ内容の正確性はデータ提供元に依存（アプリはデータをそのまま表示）
