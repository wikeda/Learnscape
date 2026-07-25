# 質問内容閲覧機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 章の問題と解答を上から順に読める通読画面（`/chapter/:chapter/questions`）を追加し、章詳細から開けるようにする。

**Architecture:** 既存の構成に従い、絞り込みロジックは `src/domain/browse.ts` の純粋関数としてTDDで実装し、画面 `QuestionListScreen` はUI状態（一括トグル／個別開閉／絞り込み選択）だけを持つ薄い層にする。新しい永続データは追加せず、`useQuestions()` と `useAppData().data.progress` を参照するだけ。

**Tech Stack:** Vite + React 19 + TypeScript, react-router-dom v7, Vitest + @testing-library/react。`verbatimModuleSyntax` が有効なので型のみの import は `import type` を使うこと。

**設計の出典:** [設計ドキュメント](../specs/2026-07-24-question-browse-design.md)

---

## File Structure

```
src/
├─ domain/
│  ├─ browse.ts              # 【新規】習熟度による絞り込み（純粋関数）
│  └─ browse.test.ts         # 【新規】上記のテスト
├─ screens/
│  ├─ QuestionListScreen.tsx      # 【新規】一覧画面
│  ├─ QuestionListScreen.test.tsx # 【新規】画面のふるまいテスト
│  └─ ChapterDetailScreen.tsx     # 【変更】「📖 一覧で見る」ボタン追加
└─ App.tsx                        # 【変更】ルート追加
```

責務の分離:
- `browse.ts` … 「どの問題を出すか」だけを決める。Reactに依存しない
- `QuestionListScreen.tsx` … 「どう見せるか／どう操作するか」だけを持つ

---

## Task 1: 絞り込みの純粋関数（browse.ts）

**Files:**
- Create: `src/domain/browse.ts`
- Test: `src/domain/browse.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/browse.test.ts` を以下の内容で作成:

```ts
import { describe, it, expect } from 'vitest';
import { filterQuestions } from './browse';
import type { Question, QuestionProgress } from './types';

// わざと No. をバラバラに並べて、昇順に整列されることを確認する
const qs: Question[] = [
  { no: 3, chapter: 'A', question: 'q3', answer: 'a3' },
  { no: 1, chapter: 'A', question: 'q1', answer: 'a1' },
  { no: 2, chapter: 'A', question: 'q2', answer: 'a2' },
  { no: 4, chapter: 'B', question: 'q4', answer: 'a4' },
];

const prog: Record<number, QuestionProgress> = {
  1: { no: 1, state: 'mastered', knownStreak: 2, lastStudiedAt: 1 },
  2: { no: 2, state: 'unsure', knownStreak: 0, lastStudiedAt: 1 },
  // 3 は未登録 → unanswered 扱い
};

describe('filterQuestions', () => {
  it('指定した状態の問題だけを No.昇順で返す', () => {
    const r = filterQuestions(qs, prog, 'A', ['mastered', 'unanswered']);
    expect(r.map((q) => q.no)).toEqual([1, 3]);
  });

  it('全状態を指定すると章の全問が No.昇順で返る', () => {
    const r = filterQuestions(qs, prog, 'A', ['mastered', 'unsure', 'failed', 'unanswered']);
    expect(r.map((q) => q.no)).toEqual([1, 2, 3]);
  });

  it('他の章の問題は含まない', () => {
    const r = filterQuestions(qs, prog, 'B', ['mastered', 'unsure', 'failed', 'unanswered']);
    expect(r.map((q) => q.no)).toEqual([4]);
  });

  it('状態の指定が空なら空配列', () => {
    expect(filterQuestions(qs, prog, 'A', [])).toEqual([]);
  });
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `npx vitest run src/domain/browse.test.ts`
Expected: FAIL（`Failed to resolve import "./browse"`）

- [ ] **Step 3: 実装する**

`src/domain/browse.ts` を以下の内容で作成:

```ts
import type { Question, QuestionProgress, MasteryState } from './types';

function stateOf(prog: Record<number, QuestionProgress>, no: number): MasteryState {
  return prog[no]?.state ?? 'unanswered';
}

/** 章の問題を、指定した習熟度の集合で絞り込む（No.昇順） */
export function filterQuestions(
  questions: Question[],
  prog: Record<number, QuestionProgress>,
  chapter: string,
  states: MasteryState[],
): Question[] {
  const set = new Set(states);
  return questions
    .filter((q) => q.chapter === chapter && set.has(stateOf(prog, q.no)))
    .sort((a, b) => a.no - b.no);
}
```

> `stateOf` は `aggregate.ts` / `session.ts` にも同名のローカル関数がある。既存の書き方に合わせてここでもローカルに置く（共通化のリファクタは今回のスコープ外）。

- [ ] **Step 4: 実行して成功を確認**

Run: `npx vitest run src/domain/browse.test.ts`
Expected: PASS（4 passed）

- [ ] **Step 5: Commit**

```bash
git add src/domain/browse.ts src/domain/browse.test.ts
git commit -m "feat: add question filter by mastery state for browse screen"
```

---

## Task 2: 一覧画面（QuestionListScreen）

**Files:**
- Create: `src/screens/QuestionListScreen.tsx`
- Test: `src/screens/QuestionListScreen.test.tsx`

前提: `src/data/questions.json` に実データが入っており、章「古代オリエント」は30問、No.1 の解答は「オリエント」、No.1 の問題文は「ラテン語で日の昇るところという意味のエジプトから西アジアにかけての地域のことを何と言うか」。テストはこの実データを使う（既存の `StudyScreen.test.tsx` と同じ方針）。

- [ ] **Step 1: 失敗するテストを書く**

`src/screens/QuestionListScreen.test.tsx` を以下の内容で作成:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppDataProvider } from '../state/AppDataContext';
import { QuestionListScreen } from './QuestionListScreen';

beforeEach(() => localStorage.clear());

function renderList() {
  return render(
    <AppDataProvider>
      <MemoryRouter initialEntries={['/chapter/古代オリエント/questions']}>
        <Routes>
          <Route path="/chapter/:chapter/questions" element={<QuestionListScreen />} />
        </Routes>
      </MemoryRouter>
    </AppDataProvider>,
  );
}

describe('QuestionListScreen', () => {
  it('初期表示では解答が見えている', () => {
    renderList();
    expect(screen.getByText('オリエント')).toBeInTheDocument();
  });

  it('一括トグルで解答が隠れ、もう一度押すと表示される', () => {
    renderList();
    fireEvent.click(screen.getByText('🙈 解答を隠す'));
    expect(screen.queryByText('オリエント')).toBeNull();

    fireEvent.click(screen.getByText('👁 解答を表示'));
    expect(screen.getByText('オリエント')).toBeInTheDocument();
  });

  it('隠している時に行をタップすると、その問題だけ解答が出る', () => {
    renderList();
    fireEvent.click(screen.getByText('🙈 解答を隠す'));
    expect(screen.queryByText('オリエント')).toBeNull();

    // No.1 の問題文をタップ（行のクリックが伝播する）
    fireEvent.click(screen.getByText(/ラテン語で日の昇るところ/));
    expect(screen.getByText('オリエント')).toBeInTheDocument();
    // 他の問題（No.2 メソポタミア）は隠れたまま
    expect(screen.queryByText('メソポタミア')).toBeNull();
  });

  it('絞り込みで「未回答」を外すと該当なしになる', () => {
    renderList();
    fireEvent.click(screen.getByText('絞り込み ▾'));
    fireEvent.click(screen.getByText('未回答'));
    expect(screen.getByText('該当する問題がありません')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `npx vitest run src/screens/QuestionListScreen.test.tsx`
Expected: FAIL（`Failed to resolve import "./QuestionListScreen"`）

- [ ] **Step 3: 実装する**

`src/screens/QuestionListScreen.tsx` を以下の内容で作成:

```tsx
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuestions } from '../hooks/useQuestions';
import { useAppData } from '../state/AppDataContext';
import { filterQuestions } from '../domain/browse';
import { STATE_COLORS } from '../domain/colors';
import type { MasteryState } from '../domain/types';

const ALL_STATES: MasteryState[] = ['mastered', 'unsure', 'failed', 'unanswered'];
const STATE_LABEL: Record<MasteryState, string> = {
  mastered: 'マスター',
  unsure: 'あやふや',
  failed: 'できなかった',
  unanswered: '未回答',
};

/** 伏せ字の幅は全問共通。解答の長さから答えを推測させないため */
const MASK_WIDTH = 96;

export function QuestionListScreen() {
  const { chapter = '' } = useParams();
  const nav = useNavigate();
  const questions = useQuestions();
  const { data } = useAppData();

  const [hidden, setHidden] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [states, setStates] = useState<MasteryState[]>(ALL_STATES);
  const [filterOpen, setFilterOpen] = useState(false);

  const total = questions.filter((q) => q.chapter === chapter).length;
  const list = useMemo(
    () => filterQuestions(questions, data.progress, chapter, states),
    [questions, data.progress, chapter, states],
  );

  function toggleHidden() {
    setHidden((h) => !h);
    setRevealed(new Set()); // 一括切替で個別の開閉はリセットする
  }

  function tapRow(no: number) {
    if (!hidden) return; // 表示中は無反応
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(no)) next.delete(no);
      else next.add(no);
      return next;
    });
  }

  function toggleState(s: MasteryState) {
    setStates((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  return (
    <div style={{ padding: '18px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => nav(-1)}
          style={{ border: 'none', background: 'none', fontSize: 20, color: 'var(--muted)', padding: 0, cursor: 'pointer' }}>‹</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{chapter}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {list.length === total ? `${total}問` : `${list.length}問 / 全${total}問`}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={toggleHidden}
          style={{ flex: 1, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: 9, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
          {hidden ? '👁 解答を表示' : '🙈 解答を隠す'}
        </button>
        <button onClick={() => setFilterOpen((o) => !o)}
          style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', fontSize: 12, cursor: 'pointer' }}>
          絞り込み ▾
        </button>
      </div>

      {filterOpen && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, background: 'var(--surface)', borderRadius: 12, padding: 12, boxShadow: 'var(--shadow)' }}>
          {ALL_STATES.map((s) => {
            const on = states.includes(s);
            return (
              <span key={s} onClick={() => toggleState(s)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 11px', borderRadius: 20, cursor: 'pointer',
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                  color: on ? 'var(--accent)' : 'var(--muted)', fontWeight: on ? 700 : 400 }}>
                <i style={{ width: 8, height: 8, borderRadius: 2, background: STATE_COLORS[s], display: 'inline-block' }} />
                {STATE_LABEL[s]}
              </span>
            );
          })}
        </div>
      )}

      {list.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '48px 0' }}>
          該当する問題がありません
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', borderRadius: 14, boxShadow: 'var(--shadow)', overflow: 'hidden', marginTop: 12 }}>
          {list.map((q, i) => {
            const state: MasteryState = data.progress[q.no]?.state ?? 'unanswered';
            const show = !hidden || revealed.has(q.no);
            return (
              <div key={q.no} onClick={() => tapRow(q.no)}
                style={{ padding: '11px 13px', display: 'flex', gap: 9,
                  borderBottom: i < list.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: hidden ? 'pointer' : 'default' }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: STATE_COLORS[state], marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, lineHeight: 1.55 }}>{q.question}</div>
                  {show ? (
                    <div style={{ marginTop: 5, textAlign: 'right', fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>
                      {q.answer}
                    </div>
                  ) : (
                    <div style={{ marginTop: 6, marginLeft: 'auto', width: MASK_WIDTH, height: 21, background: 'var(--border)', borderRadius: 6 }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 実行して成功を確認**

Run: `npx vitest run src/screens/QuestionListScreen.test.tsx`
Expected: PASS（4 passed）

- [ ] **Step 5: Commit**

```bash
git add src/screens/QuestionListScreen.tsx src/screens/QuestionListScreen.test.tsx
git commit -m "feat: add question list screen with hide/reveal and state filter"
```

---

## Task 3: 導線をつなぐ（ルート追加＋章詳細のボタン）

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/screens/ChapterDetailScreen.tsx`

- [ ] **Step 1: `src/App.tsx` にルートを追加**

`import { ChapterDetailScreen } ...` の並びに以下を追加:

```tsx
import { QuestionListScreen } from './screens/QuestionListScreen';
```

`<Routes>` 内、`/chapter/:chapter` の行の**直後**に以下を追加:

```tsx
        <Route path="/chapter/:chapter/questions" element={<QuestionListScreen />} />
```

> `IMMERSIVE` の正規表現には既に `/^\/chapter\//` が含まれているため、この画面でもフッターは自動的に非表示になる。`IMMERSIVE` は変更しないこと。

- [ ] **Step 2: `src/screens/ChapterDetailScreen.tsx` にボタンを追加**

最下部の固定ボタン群のうち、`className="btn-primary"` のボタン（「▶ この章を学習」）の**直前**に、以下のボタンを追加する:

```tsx
        <button onClick={() => nav(`/chapter/${encodeURIComponent(chapter)}/questions`)}
          style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 14, padding: 12, fontWeight: 800, marginBottom: 10, cursor: 'pointer' }}>
          📖 一覧で見る
        </button>
```

- [ ] **Step 3: ボタンが増えた分、下の余白を広げる**

同ファイルの最外側 `div` の `padding` を以下のように変更する（ボタンが最大3つになるため）:

変更前:
```tsx
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', padding: '18px 16px 140px' }}>
```

変更後:
```tsx
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', padding: '18px 16px 196px' }}>
```

- [ ] **Step 4: 型チェックとテストを実行**

Run: `npx tsc --noEmit`
Expected: エラーなし

Run: `npx vitest run`
Expected: 全テスト PASS（既存 + 今回追加分）

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/screens/ChapterDetailScreen.tsx
git commit -m "feat: wire question list screen from chapter detail"
```

---

## Task 4: 仕上げ（ビルドと受け入れ確認）

**Files:** なし（検証のみ）

- [ ] **Step 1: 本番ビルドを確認**

Run: `npm run build`
Expected: 成功（`dist/sw.js` などが生成される）

- [ ] **Step 2: 開発サーバーで受け入れ基準を確認**

Run: `npm run dev`

ブラウザで `http://localhost:5173/world-history-quiz/` を開き、以下を順に確認する:

1. ホーム → 章タイルをタップ → 章詳細に「📖 一覧で見る」がある
2. 「📖 一覧で見る」→ 一覧画面に遷移し、その章の全問が No.順で並び、**解答が見えている**
3. 下部のフッター（3タブ）が**表示されていない**
4. 「🙈 解答を隠す」→ 全問の解答がグレー帯になる。**帯の幅がすべて同じ**
5. 帯が出ている状態で任意の行をタップ → **その1問だけ**解答が出る。他は隠れたまま
6. 「👁 解答を表示」→ 全問表示に戻り、個別に開いていた状態もリセットされる
7. 「絞り込み ▾」→ 4つの状態チップが出る。どれかを外すと件数が変わり、ヘッダーが「◯問 / 全◯問」になる
8. 全部外すと「該当する問題がありません」と出る
9. 左上「‹」で章詳細に戻れる
10. 一覧を見た後にホーム/章詳細に戻っても、**習熟度と伸びグラフが変化していない**

- [ ] **Step 3: 確認できたら Commit（変更がある場合のみ）**

Step 2 で不具合が見つかった場合は修正してからコミットする。修正が不要ならこのタスクでのコミットは不要。

---

## 受け入れ基準（設計ドキュメントより）

- [ ] 章詳細から「📖 一覧で見る」で一覧画面に遷移でき、「‹」で戻れる
- [ ] その章の全問が No.順 で表示され、初期状態で解答が見えている
- [ ] 一括トグルで全問の解答が隠れ、再度押すと全問表示される
- [ ] 隠れている状態で行をタップすると、その1問だけ解答が表示される
- [ ] 伏せ字の幅がすべての問題で同一である
- [ ] 習熟度で絞り込むと該当問題だけが表示され、ヘッダーの件数が更新される
- [ ] 一覧画面では習熟度が変化しない（クイズ以外で進捗が動かない）
- [ ] フッター（3タブ）は一覧画面では非表示になる

---

## Self-Review メモ（作成者チェック済み）

- 設計ドキュメントの各節（導線／レイアウト／振る舞い／実装方針／受け入れ基準）に対応するタスクを用意した。
- 「解答表示中のタップは無反応」→ `tapRow` の early return で実装（Task 2）。
- 「絞り込み0件時の表示」→ `list.length === 0` の分岐で実装（Task 2）、テストでも検証。
- 「伏せ字は全問同一幅」→ `MASK_WIDTH` 定数で担保（Task 2）、手動確認項目にも記載。
- 「閲覧専用」→ この画面は `useAppData()` の `data` しか読まず、`recordAnswer` 等を一切呼ばない（Task 2）。手動確認10で検証。
- 関数シグネチャ `filterQuestions(questions, prog, chapter, states)` は Task 1 の定義と Task 2 の呼び出しで一致。
- `MasteryState` / `STATE_COLORS` は既存の `src/domain/types.ts` / `src/domain/colors.ts` の定義をそのまま使用。
