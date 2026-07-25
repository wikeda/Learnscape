import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppDataProvider } from '../state/AppDataContext';
import { StudyScreen } from './StudyScreen';
import { HAPTIC_PATTERNS } from '../domain/haptics';

// hapticEventForSwipe を spy 化する。HAPTIC_PATTERNS.mastered と .known は
// どちらも [12] で同一のため、vibrate に渡る引数だけを見るテストでは
// 「判定前の progress を渡していること」「hapticEventForSwipe を通していること」
// を検証できない。importOriginal で実物をラップし、実装はそのまま・呼び出しだけ
// 記録できるようにする（他の export は実物のまま）。
vi.mock('../domain/haptics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../domain/haptics')>();
  return { ...actual, hapticEventForSwipe: vi.fn(actual.hapticEventForSwipe) };
});
import { hapticEventForSwipe } from '../domain/haptics';

const vibrate = vi.fn();

beforeEach(() => {
  localStorage.clear();
  vibrate.mockClear();
  vi.mocked(hapticEventForSwipe).mockClear();
  Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true, writable: true });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'vibrate');
});

/** 部分的なデータを流し込む。足りない項目は mergeDefaults が既定値で埋める */
function seed(settings: Record<string, unknown>, progress: Record<number, unknown> = {}) {
  localStorage.setItem('whq:data', JSON.stringify({ settings, progress }));
}

/** 文字列パスに加えて、failed モードで使う { pathname, state } 形式も受け付ける */
function renderAt(path: string | { pathname: string; state?: unknown }) {
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

  it('マスター到達時は判定前の progress を渡して mastered を選ぶ', () => {
    // HAPTIC_PATTERNS.mastered と .known はどちらも [12] なので、vibrate の
    // 呼び出し引数だけを見るテストでは「hapticEventForSwipe を通しているか」
    // 「判定前(before)の progress を渡しているか」を区別できない
    // （judge() の該当2行を fire(result) に丸ごと置き換えても既存テストは通ってしまう）。
    // そこで hapticEventForSwipe 自体を spy にして、引数と戻り値を直接検証する。
    seed(
      { order: 'sequential', sessionSize: 3, hapticEnabled: true, masterThreshold: 2 },
      { 1: { no: 1, state: 'unsure', knownStreak: 1, lastStudiedAt: 1 } },
    );
    renderAt('/study/chapter/古代オリエント');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(hapticEventForSwipe).toHaveBeenCalledWith(
      { no: 1, state: 'unsure', knownStreak: 1, lastStudiedAt: 1 }, 'known', 2,
    );
    expect(vi.mocked(hapticEventForSwipe).mock.results[0].value).toBe('mastered');
  });

  it('マスター済みの問題を復習で正解しても hapticEventForSwipe は known を返す', () => {
    // 上のテストと対になる回帰確認。before.state が既に 'mastered' なら
    // hapticEventForSwipe は mastered を返してはいけない（mastered は
    // 「未マスター→マスター」の遷移時だけ）。judge() が before ではなく
    // 判定後の状態や誤った値を渡すと、この区別が壊れても vibrate のパターン
    // （known と同じ [12]）だけを見るテストでは気づけない。
    //
    // No.1 のみを mastered にしておく。buildChapterSession は sequential
    // 指定時、未マスター問題とメンテナンス対象（maintenanceRatio: 0.2 で
    // 混ぜたマスター済み）をまとめて no 昇順に並べ替えるため、No.1 が
    // マスター済みであっても no が最小なら必ず先頭に来る。
    // 章の残り29問は未回答（未マスター扱い）のままなので
    // maintainCount = floor(29 * 0.2) = 5 >= 1 となり、
    // マスター済みの No.1 は必ずメンテナンス対象として混入する。
    seed(
      { order: 'sequential', sessionSize: 3, hapticEnabled: true, masterThreshold: 2 },
      { 1: { no: 1, state: 'mastered', knownStreak: 2, lastStudiedAt: 1 } },
    );
    renderAt('/study/chapter/古代オリエント');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(hapticEventForSwipe).toHaveBeenCalledWith(
      { no: 1, state: 'mastered', knownStreak: 2, lastStudiedAt: 1 }, 'known', 2,
    );
    expect(vi.mocked(hapticEventForSwipe).mock.results[0].value).toBe('known');
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

  it('複数問セッションでも最後の1問だけは判定振動が鳴らず完了パターンのみになる', () => {
    // isLast = next >= session.length の分岐はセッション長に依存しないはずだが、
    // sessionSize: 1 のケースだけでは「最後の1問」が「先頭の1問」でもあるため区別できない。
    // 3問セッションで呼び出し列そのものを検証し、1・2問目は判定振動、3問目は完了振動のみ
    // （＝3問目で判定振動と完了振動が両方鳴って4回になっていないこと）を確認する。
    seed({ order: 'sequential', sessionSize: 3, hapticEnabled: true, masterThreshold: 2 });
    renderAt('/study/chapter/古代オリエント');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(vibrate.mock.calls).toEqual([
      [HAPTIC_PATTERNS.known],
      [HAPTIC_PATTERNS.known],
      [HAPTIC_PATTERNS.complete],
    ]);
    expect(vibrate).toHaveBeenCalledTimes(3);
  });

  it('設定がOFFなら一切振動しない', () => {
    seed({ order: 'sequential', sessionSize: 1, hapticEnabled: false });
    renderAt('/study/chapter/古代オリエント');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('failed モード（できなかった◯問だけ）でも判定で正しく振動が鳴る', () => {
    // これまでの振動テストはすべて /study/chapter/... 経由。
    // /study/failed/... はリザルト画面の「できなかった◯問だけ」の主要導線で、
    // StudyScreen の initial useMemo 内で loc.state.failedNos から
    // pickByNumbers を使う別経路（buildChapterSession を通らない）のため、
    // 別途カバーしないと judge() の振動配線が未検証のまま残る。
    seed({ order: 'sequential', sessionSize: 3, hapticEnabled: true, masterThreshold: 2 });
    renderAt({ pathname: '/study/failed/古代オリエント', state: { failedNos: [1, 2] } });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.known);
  });

  it('下方向へのポインタドラッグ（解答を絞る操作）では振動しない', () => {
    // 「解答を絞り表示しても振動しない」テストは ArrowDown キーのみを検証しており、
    // 実機の主操作であるポインタ（タッチ／マウス）での下方向スワイプは
    // pointerDown/pointerMove/pointerUp という別のコードパスを通るため未検証だった。
    // ドラッグ量は Flashcard.tsx の THRESHOLD(90) を超える値にし、
    // 「しきい値未満だから鳴らなかっただけ」ではないことを保証する。
    seed({ order: 'sequential', sessionSize: 3, hapticEnabled: true });
    renderAt('/study/chapter/古代オリエント');
    const card = screen.getByText('問題').parentElement!.parentElement!;
    fireEvent.pointerDown(card, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(card, { clientX: 0, clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(card, { clientX: 0, clientY: 200, pointerId: 1 });
    expect(vibrate).not.toHaveBeenCalled();
  });
});
