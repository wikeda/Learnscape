# 振動フィードバック Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 出題画面の4方向スワイプ判定に、判定内容が手触りで分かる短い振動を付ける。設定でON/OFFできる。

**Architecture:** 既存の構成に従い、振動パターンと「判定→イベント」の変換は `src/domain/haptics.ts` の純粋関数としてTDDで実装する。`navigator.vibrate` と設定の接続は `src/hooks/useHaptic.ts` に閉じ込め、画面は `fire('known')` と書くだけの薄い層に保つ。習熟度の遷移ルールは既存の `applySwipe` を再利用し、二重に持たない。新しい永続データは追加しない（`Settings.hapticEnabled` は既存フィールド）。

**Tech Stack:** Vite + React 19 + TypeScript, react-router-dom v7, Vitest + @testing-library/react + jsdom。`verbatimModuleSyntax` が有効なので型のみの import は `import type` を使うこと。

**設計の出典:** [設計ドキュメント](../specs/2026-07-24-haptic-feedback-design.md)

---

## File Structure

```
src/
├─ domain/
│  ├─ haptics.ts             # 【新規】パターン定義＋判定→イベント変換（純粋・React非依存）
│  └─ haptics.test.ts        # 【新規】上記のテスト
├─ hooks/
│  ├─ useHaptic.ts           # 【新規】設定と navigator.vibrate の接続
│  └─ useHaptic.test.tsx     # 【新規】上記のテスト
├─ screens/
│  ├─ StudyScreen.tsx        # 【変更】判定時・完了時に発火
│  ├─ StudyScreen.test.tsx   # 【変更】振動の発火をテストに追加
│  ├─ SettingsScreen.tsx     # 【変更】ON/OFF行を追加
│  └─ SettingsScreen.test.tsx # 【新規】トグルと非対応端末の注記のテスト
└─ ...
README.md                    # 【変更】設定項目の記載を更新
```

責務の分離:
- `haptics.ts` … 「どの振動を鳴らすか」だけを決める。`navigator` にも React にも依存しない
- `useHaptic.ts` … 「実際に鳴らす」だけ。設定の読み取りと機能検出・例外の握りつぶしを引き受ける
- 画面 … 「いつ鳴らすか」だけを知る

---

## 前提知識（この計画を実行する人へ）

- テストは `npm test`（`vitest run`）。単体で走らせるときは `npx vitest run <path>`
- 永続データは `localStorage` のキー `whq:data`。`src/storage/storage.ts` の `mergeDefaults` が既定値で埋めるので、**テストでは `{ settings: {...}, progress: {...} }` の部分的なJSONを入れるだけでよい**
- `navigator.vibrate` は jsdom に存在しない。テストでは `Object.defineProperty` で生やす
- `navigator.vibrate` の型（`VibratePattern`）は TypeScript の `lib.dom` に含まれる。型定義の追加は不要
- 出題セッションは `buildChapterSession` が組む。`order: 'sequential'` かつ `sessionSize: N` なら「章の未マスター問題を No.昇順で先頭N問」になるので、テストは決定的にできる
- 章「古代オリエント」は No.1 から始まる30問

---

## Task 1: 振動パターンの定義（haptics.ts）

**Files:**
- Create: `src/domain/haptics.ts`
- Test: `src/domain/haptics.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/haptics.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { HAPTIC_PATTERNS, hapticPattern } from './haptics';
import type { HapticEvent } from './haptics';

const ALL_EVENTS: HapticEvent[] = ['known', 'unsure', 'failed', 'mastered', 'complete'];

describe('hapticPattern', () => {
  it('有効なら対応するパターンを返す', () => {
    expect(hapticPattern('known', true)).toEqual(HAPTIC_PATTERNS.known);
    expect(hapticPattern('complete', true)).toEqual(HAPTIC_PATTERNS.complete);
  });

  it('無効なら null を返す', () => {
    expect(hapticPattern('known', false)).toBeNull();
    expect(hapticPattern('complete', false)).toBeNull();
  });

  it('すべてのイベントにパターンが定義されている', () => {
    for (const e of ALL_EVENTS) {
      expect(HAPTIC_PATTERNS[e].length).toBeGreaterThan(0);
    }
  });

  it('パターンは振動で始まり振動で終わる（奇数長）', () => {
    // navigator.vibrate は 奇数番目=振動 / 偶数番目=休止 として解釈する。
    // 偶数長だと末尾が休止になり、無意味な待ち時間が残る。
    for (const p of Object.values(HAPTIC_PATTERNS)) {
      expect(p.length % 2).toBe(1);
    }
  });

  it('パターンの各値は正の数', () => {
    for (const p of Object.values(HAPTIC_PATTERNS)) {
      for (const ms of p) expect(ms).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: テストを走らせて失敗を確認**

```bash
npx vitest run src/domain/haptics.test.ts
```

期待: FAIL（`Failed to resolve import "./haptics"`）

- [ ] **Step 3: 最小の実装を書く**

`src/domain/haptics.ts`:

```ts
export type HapticEvent = 'known' | 'unsure' | 'failed' | 'mastered' | 'complete';

/**
 * navigator.vibrate に渡すミリ秒配列（奇数番目=振動 / 偶数番目=休止）。
 * 1セッション10問が既定なので、連続しても煩わしくない長さに収めている。
 */
export const HAPTIC_PATTERNS: Record<HapticEvent, number[]> = {
  known: [12],                        // 短い一発。歯切れよく軽い
  unsure: [8, 40, 8],                 // 軽い2連。「迷い」を表す
  failed: [28],                       // やや長い一発。重さを残す
  mastered: [12],                     // known と同じ。回答のテンポを乱さないため（設計書 2章参照）
  complete: [18, 60, 18, 60, 40],     // 完了の合図
};

/** 無効なら null。呼び出し側の分岐を1つに絞るため */
export function hapticPattern(event: HapticEvent, enabled: boolean): number[] | null {
  return enabled ? HAPTIC_PATTERNS[event] : null;
}
```

- [ ] **Step 4: テストを走らせて成功を確認**

```bash
npx vitest run src/domain/haptics.test.ts
```

期待: PASS（5件）

- [ ] **Step 5: コミット**

```bash
git add src/domain/haptics.ts src/domain/haptics.test.ts
git commit -m "feat: 振動パターンの定義を追加"
```

---

## Task 2: 判定からイベントへの変換（haptics.ts）

判定の結果どのイベントを鳴らすかを決める。**マスターに「移行した瞬間」だけ** `mastered` にするのがこのタスクの肝。

**Files:**
- Modify: `src/domain/haptics.ts`
- Test: `src/domain/haptics.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/haptics.test.ts` の末尾に追記する。ファイル先頭の import も次のとおり書き換える:

```ts
import { describe, it, expect } from 'vitest';
import { HAPTIC_PATTERNS, hapticPattern, hapticEventForSwipe } from './haptics';
import type { HapticEvent } from './haptics';
import { initialProgress } from './mastery';
import type { QuestionProgress } from './types';
```

追記するテスト:

```ts
describe('hapticEventForSwipe', () => {
  const fresh = initialProgress(1);
  const almost: QuestionProgress = { no: 1, state: 'unsure', knownStreak: 1, lastStudiedAt: 1 };
  const mastered: QuestionProgress = { no: 1, state: 'mastered', knownStreak: 2, lastStudiedAt: 1 };

  it('まだマスターに届かない「覚えた」は known', () => {
    expect(hapticEventForSwipe(fresh, 'known', 2)).toBe('known');
  });

  it('「あやふや」は unsure', () => {
    expect(hapticEventForSwipe(fresh, 'unsure', 2)).toBe('unsure');
  });

  it('「できなかった」は failed', () => {
    expect(hapticEventForSwipe(fresh, 'failed', 2)).toBe('failed');
  });

  it('マスターに到達した判定は mastered', () => {
    expect(hapticEventForSwipe(almost, 'known', 2)).toBe('mastered');
  });

  it('マスター済みを復習で正解しても mastered にはしない', () => {
    // 定着維持でマスター済み問題が混ざるため、ここを区別しないとご褒美が安売りになる
    expect(hapticEventForSwipe(mastered, 'known', 2)).toBe('known');
  });

  it('マスター済みを「できなかった」で叩いたら failed', () => {
    expect(hapticEventForSwipe(mastered, 'failed', 2)).toBe('failed');
  });

  it('しきい値1なら最初の「覚えた」で mastered', () => {
    expect(hapticEventForSwipe(fresh, 'known', 1)).toBe('mastered');
  });
});
```

- [ ] **Step 2: テストを走らせて失敗を確認**

```bash
npx vitest run src/domain/haptics.test.ts
```

期待: FAIL（`hapticEventForSwipe is not a function`）

- [ ] **Step 3: 最小の実装を書く**

`src/domain/haptics.ts` の先頭に import を追加し、末尾に関数を追加する:

```ts
import type { QuestionProgress, SwipeResult, MasterThreshold } from './types';
import { applySwipe } from './mastery';
```

```ts
/**
 * 判定の結果どのイベントを鳴らすかを決める。
 * 遷移ルールは applySwipe に一本化する（ここでしきい値を数え直さない）。
 */
export function hapticEventForSwipe(
  before: QuestionProgress,
  result: SwipeResult,
  threshold: MasterThreshold,
): HapticEvent {
  const after = applySwipe(before, result, threshold, 0); // 時刻は状態判定に影響しない
  if (after.state === 'mastered' && before.state !== 'mastered') return 'mastered';
  return result;
}
```

- [ ] **Step 4: テストを走らせて成功を確認**

```bash
npx vitest run src/domain/haptics.test.ts
```

期待: PASS（12件）

- [ ] **Step 5: コミット**

```bash
git add src/domain/haptics.ts src/domain/haptics.test.ts
git commit -m "feat: 判定から振動イベントへの変換を追加"
```

---

## Task 3: 振動を鳴らすフック（useHaptic.ts）

**Files:**
- Create: `src/hooks/useHaptic.ts`
- Test: `src/hooks/useHaptic.test.tsx`（JSXを使うので拡張子は `.tsx`）

- [ ] **Step 1: 失敗するテストを書く**

`src/hooks/useHaptic.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppDataProvider } from '../state/AppDataContext';
import { useHaptic, isHapticSupported } from './useHaptic';
import { HAPTIC_PATTERNS } from '../domain/haptics';

const vibrate = vi.fn();

function setVibrate(fn: unknown) {
  Object.defineProperty(navigator, 'vibrate', { value: fn, configurable: true, writable: true });
}

function seedSettings(settings: Record<string, unknown>) {
  localStorage.setItem('whq:data', JSON.stringify({ settings }));
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <AppDataProvider>{children}</AppDataProvider>;
}

beforeEach(() => {
  localStorage.clear();
  vibrate.mockClear();
  setVibrate(vibrate);
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'vibrate');
});

describe('isHapticSupported', () => {
  it('navigator.vibrate があれば true', () => {
    expect(isHapticSupported()).toBe(true);
  });

  it('navigator.vibrate が無ければ false', () => {
    Reflect.deleteProperty(navigator, 'vibrate');
    expect(isHapticSupported()).toBe(false);
  });
});

describe('useHaptic', () => {
  it('既定（ON）ではイベントのパターンで振動する', () => {
    const { result } = renderHook(() => useHaptic(), { wrapper });
    act(() => result.current('known'));
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.known);
  });

  it('設定がOFFなら振動しない', () => {
    seedSettings({ hapticEnabled: false });
    const { result } = renderHook(() => useHaptic(), { wrapper });
    act(() => result.current('known'));
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('非対応の端末でも例外を投げない', () => {
    Reflect.deleteProperty(navigator, 'vibrate');
    const { result } = renderHook(() => useHaptic(), { wrapper });
    expect(() => act(() => result.current('known'))).not.toThrow();
  });

  it('vibrate が例外を投げても呼び出し側には伝播しない', () => {
    setVibrate(() => { throw new Error('blocked'); });
    const { result } = renderHook(() => useHaptic(), { wrapper });
    expect(() => act(() => result.current('known'))).not.toThrow();
  });
});
```

- [ ] **Step 2: テストを走らせて失敗を確認**

```bash
npx vitest run src/hooks/useHaptic.test.tsx
```

期待: FAIL（`Failed to resolve import "./useHaptic"`）

- [ ] **Step 3: 最小の実装を書く**

`src/hooks/useHaptic.ts`:

```ts
import { useCallback } from 'react';
import { useAppData } from '../state/AppDataContext';
import { hapticPattern } from '../domain/haptics';
import type { HapticEvent } from '../domain/haptics';

/** 端末が振動APIに対応しているか（iOS Safari は非対応） */
export function isHapticSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function useHaptic(): (event: HapticEvent) => void {
  const { data } = useAppData();
  const enabled = data.settings.hapticEnabled;

  return useCallback((event: HapticEvent) => {
    const pattern = hapticPattern(event, enabled);
    if (!pattern || !isHapticSupported()) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // 端末やブラウザの都合で失敗しても学習は止めない
    }
  }, [enabled]);
}
```

- [ ] **Step 4: テストを走らせて成功を確認**

```bash
npx vitest run src/hooks/useHaptic.test.tsx
```

期待: PASS（6件）

- [ ] **Step 5: コミット**

```bash
git add src/hooks/useHaptic.ts src/hooks/useHaptic.test.tsx
git commit -m "feat: 振動を鳴らすフックを追加"
```

---

## Task 4: 出題画面に振動を繋ぐ（StudyScreen）

**Files:**
- Modify: `src/screens/StudyScreen.tsx`
- Test: `src/screens/StudyScreen.test.tsx`

- [ ] **Step 1: 失敗するテストを書く**

`src/screens/StudyScreen.test.tsx` を次の内容に**置き換える**（既存のテストも含んでいる）:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppDataProvider } from '../state/AppDataContext';
import { StudyScreen } from './StudyScreen';
import { HAPTIC_PATTERNS } from '../domain/haptics';

const vibrate = vi.fn();

beforeEach(() => {
  localStorage.clear();
  vibrate.mockClear();
  Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true, writable: true });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'vibrate');
});

/** 部分的なデータを流し込む。足りない項目は mergeDefaults が既定値で埋める */
function seed(settings: Record<string, unknown>, progress: Record<number, unknown> = {}) {
  localStorage.setItem('whq:data', JSON.stringify({ settings, progress }));
}

function renderAt(path: string) {
  return render(
    <AppDataProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/study/:mode/:chapter" element={<StudyScreen />} />
          <Route path="/result" element={<div>リザルト</div>} />
        </Routes>
      </MemoryRouter>
    </AppDataProvider>,
  );
}

describe('StudyScreen', () => {
  it('進捗と問題を表示し、全問回答でリザルトへ', () => {
    renderAt('/study/chapter/古代オリエント');
    expect(screen.getByText(/\/\s*\d+/)).toBeInTheDocument();
    for (let i = 0; i < 60; i++) {
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      if (screen.queryByText('リザルト')) break;
    }
    expect(screen.getByText('リザルト')).toBeInTheDocument();
  });
});

describe('StudyScreen の振動', () => {
  it('「覚えた」で known のパターンが鳴る', () => {
    seed({ order: 'sequential', sessionSize: 3, hapticEnabled: true, masterThreshold: 2 });
    renderAt('/study/chapter/古代オリエント');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.known);
  });

  it('「あやふや」で unsure のパターンが鳴る', () => {
    seed({ order: 'sequential', sessionSize: 3, hapticEnabled: true, masterThreshold: 2 });
    renderAt('/study/chapter/古代オリエント');
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.unsure);
  });

  it('「できなかった」で failed のパターンが鳴る', () => {
    seed({ order: 'sequential', sessionSize: 3, hapticEnabled: true, masterThreshold: 2 });
    renderAt('/study/chapter/古代オリエント');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.failed);
  });

  it('マスターに到達した判定は mastered のパターンが鳴る', () => {
    // mastered と known はパターンが同じ [12] なので、このテストは
    // 「イベントの出し分け」までは検証できない。その分岐は Task 2 の
    // hapticEventForSwipe のドメインテストが守っている。
    // ここではマスター到達時にも正しく振動が鳴ることだけを確認する。
    // No.1 を「あと1回」の状態にしておく（章の先頭問題なので sequential で必ず1問目に出る）
    seed(
      { order: 'sequential', sessionSize: 3, hapticEnabled: true, masterThreshold: 2 },
      { 1: { no: 1, state: 'unsure', knownStreak: 1, lastStudiedAt: 1 } },
    );
    renderAt('/study/chapter/古代オリエント');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.mastered);
  });

  it('解答を絞り表示しても振動しない', () => {
    seed({ order: 'sequential', sessionSize: 3, hapticEnabled: true });
    renderAt('/study/chapter/古代オリエント');
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('最終問題では complete のパターンだけが鳴る', () => {
    // vibrate は再生中のパターンを置き換えるため、判定の振動を鳴らすと切れてしまう
    seed({ order: 'sequential', sessionSize: 1, hapticEnabled: true });
    renderAt('/study/chapter/古代オリエント');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.complete);
  });

  it('設定がOFFなら一切振動しない', () => {
    seed({ order: 'sequential', sessionSize: 1, hapticEnabled: false });
    renderAt('/study/chapter/古代オリエント');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(vibrate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: テストを走らせて失敗を確認**

```bash
npx vitest run src/screens/StudyScreen.test.tsx
```

期待: 「StudyScreen の振動」の7件中6件が FAIL（`vibrate` が呼ばれない）。
「解答を絞り表示しても振動しない」だけは実装前でも通る。

- [ ] **Step 3: 最小の実装を書く**

`src/screens/StudyScreen.tsx` の import に3行追加する:

```tsx
import { useHaptic } from '../hooks/useHaptic';
import { hapticEventForSwipe } from '../domain/haptics';
import { initialProgress } from '../domain/mastery';
```

コンポーネント冒頭、`const loc = useLocation();` の直後にフックを取得する:

```tsx
  const fire = useHaptic();
```

`judge` 関数を次のように差し替える:

```tsx
  function judge(result: SwipeResult) {
    const next = idx + 1;
    const isLast = next >= session.length;
    // 最終問題は完了パターンだけを鳴らす。
    // navigator.vibrate は再生中のパターンをキューせず置き換えるため、
    // 続けて鳴らすと判定側の振動が途中で切れてしまう。
    if (!isLast) {
      const before = data.progress[q.no] ?? initialProgress(q.no);
      fire(hapticEventForSwipe(before, result, data.settings.masterThreshold));
    }
    recordAnswer(q.no, result);
    tally.current[result]++;
    if (isLast) setFinishing(true);
    else setIdx(next);
  }
```

完了時の発火は、`finishing` を見ている `useEffect` の中、`finished.current = true;` の直後に1行足す:

```tsx
    finished.current = true;
    fire('complete');
```

- [ ] **Step 4: テストを走らせて成功を確認**

```bash
npx vitest run src/screens/StudyScreen.test.tsx
```

期待: PASS（8件）

- [ ] **Step 5: コミット**

```bash
git add src/screens/StudyScreen.tsx src/screens/StudyScreen.test.tsx
git commit -m "feat: 出題画面の判定と完了に振動フィードバックを追加"
```

---

## Task 5: 設定にON/OFFを追加（SettingsScreen）

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`
- Test: `src/screens/SettingsScreen.test.tsx`（新規）

- [ ] **Step 1: 失敗するテストを書く**

`src/screens/SettingsScreen.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppDataProvider } from '../state/AppDataContext';
import { SettingsScreen } from './SettingsScreen';

const NOTE = 'この端末は振動に対応していません';

function setVibrate(fn: unknown) {
  Object.defineProperty(navigator, 'vibrate', { value: fn, configurable: true, writable: true });
}

function renderScreen() {
  return render(<AppDataProvider><SettingsScreen /></AppDataProvider>);
}

beforeEach(() => {
  localStorage.clear();
  setVibrate(vi.fn());
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'vibrate');
});

describe('SettingsScreen の振動フィードバック', () => {
  it('項目が表示され、既定はONである', () => {
    renderScreen();
    expect(screen.getByText('振動フィードバック')).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem('whq:data')!);
    expect(saved.settings.hapticEnabled).toBe(true);
  });

  it('OFFを押すと設定に保存される', () => {
    renderScreen();
    fireEvent.click(screen.getByText('OFF'));
    const saved = JSON.parse(localStorage.getItem('whq:data')!);
    expect(saved.settings.hapticEnabled).toBe(false);
  });

  it('対応端末では注記を出さない', () => {
    renderScreen();
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });

  it('非対応端末では注記を出す', () => {
    // 行ごと隠すと「なぜ無効なのか」が伝わらないため、表示したうえで理由を書く
    Reflect.deleteProperty(navigator, 'vibrate');
    renderScreen();
    expect(screen.getByText(NOTE)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: テストを走らせて失敗を確認**

```bash
npx vitest run src/screens/SettingsScreen.test.tsx
```

期待: FAIL（`Unable to find an element with the text: 振動フィードバック`）

- [ ] **Step 3: 最小の実装を書く**

`src/screens/SettingsScreen.tsx` の import に1行追加する:

```tsx
import { isHapticSupported } from '../hooks/useHaptic';
```

「学習」セクションの「マスター判定」の `Row` の**直後**（`</Section>` の直前）に追加する:

```tsx
        <Row label="振動フィードバック">
          <Segmented<boolean> value={s.hapticEnabled}
            options={[[true, 'ON'], [false, 'OFF']]}
            onChange={(hapticEnabled) => updateSettings({ hapticEnabled })} />
          {!isHapticSupported() && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
              この端末は振動に対応していません
            </div>
          )}
        </Row>
```

`Segmented` は現在 `T extends string | number` に制約されていて `boolean` を渡せない。ファイル末尾の定義の型引数を広げる:

```tsx
function Segmented<T extends string | number | boolean>({ value, options, onChange }:
  { value: T; options: [T, string][]; onChange: (v: T) => void }) {
```

（`key={String(v)}` は既に文字列化しているので変更不要）

- [ ] **Step 4: テストを走らせて成功を確認**

```bash
npx vitest run src/screens/SettingsScreen.test.tsx
```

期待: PASS（4件）

- [ ] **Step 5: コミット**

```bash
git add src/screens/SettingsScreen.tsx src/screens/SettingsScreen.test.tsx
git commit -m "feat: 設定に振動フィードバックのON/OFFを追加"
```

---

## Task 6: ドキュメント更新と全体検証

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README の特長リストに追記**

`README.md` の次の行:

```markdown
- **ストリーク**（連続学習日数）でモチベ維持
```

を、次の2行に置き換える:

```markdown
- **振動フィードバック**：判定ごとに手触りの違う短い振動（覚えた／あやふや／できなかった／マスター到達／セッション完了）。設定でOFFにでき、非対応端末（iOS等）では自動的に無効
- **ストリーク**（連続学習日数）でモチベ維持
```

- [ ] **Step 2: README の画面構成の表を更新**

次の行:

```markdown
| 設定 | テーマ/アクセント・出題順・セッション問題数・マスター判定・データ管理 |
```

を、次に置き換える:

```markdown
| 設定 | テーマ/アクセント・出題順・セッション問題数・マスター判定・振動フィードバック・データ管理 |
```

- [ ] **Step 3: テストをすべて走らせる**

```bash
npm test
```

期待: PASS。既存48件＋今回追加分（haptics 12・useHaptic 6・StudyScreen 7・SettingsScreen 4）で **77件**。
既存の48件が1件も落ちていないことを確認すること。

- [ ] **Step 4: 型チェックとビルドを通す**

```bash
npm run build
```

期待: エラーなく `dist/` が生成される。
`verbatimModuleSyntax` により、型のみの import が `import type` になっていないと**ここで落ちる**。

- [ ] **Step 5: コミット**

```bash
git add README.md
git commit -m "docs: READMEに振動フィードバックを追記"
```

---

## Task 7: 実機確認（Android）

自動テストは「呼ばれたか」しか見ない。**振動の強さと長さは実機でしか判断できない。**

- [ ] **Step 1: ブランチを main にマージして push（自動デプロイ）**

```bash
git checkout main && git merge feat/haptic-feedback && git push
```

- [ ] **Step 2: GitHub Actions の完了を待つ**

```bash
gh run watch
```

- [ ] **Step 3: Android 実機で確認**

https://wikeda.github.io/world-history-quiz/ を開く。
**PWAとしてインストール済みの場合は一度リロード（または再起動）する** — しないとキャッシュが更新されず古いままになる。

確認項目:
- [ ] 右・上・左スワイプで、それぞれ違う手触りの振動がある
- [ ] マスター到達時も「覚えた」と同じ軽い振動で、テンポが乱れない
- [ ] セッション最終問題で完了の振動が鳴り、途中で切れた感じがしない
- [ ] 下ドラッグ（解答の絞り表示）では振動しない
- [ ] 設定でOFFにすると一切振動しない
- [ ] 振動が長すぎ／弱すぎと感じないか

- [ ] **Step 4: 体感が合わなければパターンを調整する**

`src/domain/haptics.ts` の `HAPTIC_PATTERNS` の数値だけを変える。
**この調整でテストは壊れない** — テストはパターンの値を直書きせず `HAPTIC_PATTERNS` を参照しているため。

調整した場合:

```bash
npm test && git add src/domain/haptics.ts && git commit -m "tune: 振動パターンを実機の体感に合わせて調整" && git push
```

---

## 完了の定義

設計ドキュメントの受け入れ基準がすべて満たされていること:

- [ ] 右スワイプで `known`、上で `unsure`、左で `failed` のパターンが振動する
- [ ] マスターに到達した判定では `mastered` のパターンが鳴る
- [ ] すでにマスター済みの問題を復習で正解しても `mastered` は鳴らない（`known` が鳴る）
- [ ] セッション最終問題では `complete` のみが鳴る（判定の振動は鳴らない）
- [ ] 下ドラッグ（解答の絞り表示）では振動しない
- [ ] 設定「学習」に振動フィードバックのON/OFFがあり、OFFにすると一切振動しない
- [ ] 設定の既定値はONである
- [ ] `navigator.vibrate` 非対応の端末でエラーが出ず、設定行に注記が表示される
- [ ] 既存の48件のテストが引き続き通る
- [ ] `npm run build` が通る
