import { describe, it, expect } from 'vitest';
import { applySwipe, initialProgress } from './mastery';

const base = initialProgress(1);

describe('applySwipe', () => {
  it('failed にすると state=failed, streak=0', () => {
    const r = applySwipe(base, 'failed', 2, 1000);
    expect(r.state).toBe('failed');
    expect(r.knownStreak).toBe(0);
    expect(r.lastStudiedAt).toBe(1000);
  });

  it('unsure にすると state=unsure, streak=0', () => {
    const r = applySwipe({ ...base, knownStreak: 1 }, 'unsure', 2, 1);
    expect(r.state).toBe('unsure');
    expect(r.knownStreak).toBe(0);
  });

  it('threshold=2: known 1回目はまだ unsure（あと1回）', () => {
    const r = applySwipe(base, 'known', 2, 1);
    expect(r.knownStreak).toBe(1);
    expect(r.state).toBe('unsure');
  });

  it('threshold=2: known 2回連続で mastered', () => {
    const r1 = applySwipe(base, 'known', 2, 1);
    const r2 = applySwipe(r1, 'known', 2, 2);
    expect(r2.knownStreak).toBe(2);
    expect(r2.state).toBe('mastered');
  });

  it('threshold=1: known 1回で mastered', () => {
    const r = applySwipe(base, 'known', 1, 1);
    expect(r.state).toBe('mastered');
  });

  it('mastered を failed で叩くと failed に戻り streak リセット', () => {
    const mastered = { no: 1, state: 'mastered' as const, knownStreak: 2, lastStudiedAt: 1 };
    const r = applySwipe(mastered, 'failed', 2, 5);
    expect(r.state).toBe('failed');
    expect(r.knownStreak).toBe(0);
  });
});
