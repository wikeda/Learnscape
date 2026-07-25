import { describe, it, expect } from 'vitest';
import { HAPTIC_PATTERNS, hapticPattern, hapticEventForSwipe } from './haptics';
import type { HapticEvent } from './haptics';
import { initialProgress } from './mastery';
import type { QuestionProgress } from './types';

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
