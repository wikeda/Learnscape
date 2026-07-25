import { describe, it, expect } from 'vitest';
import { buildChapterSession, buildUnsureSession } from './session';
import type { Question, QuestionProgress } from './types';

const qs: Question[] = Array.from({ length: 10 }, (_, i) => ({
  no: i + 1, chapter: 'A', question: `q${i + 1}`, answer: 'a',
}));

function prog(map: Record<number, QuestionProgress['state']>): Record<number, QuestionProgress> {
  const p: Record<number, QuestionProgress> = {};
  for (const [no, state] of Object.entries(map)) {
    p[+no] = { no: +no, state, knownStreak: 0, lastStudiedAt: 1 };
  }
  return p;
}

describe('buildChapterSession', () => {
  it('未マスター中心（マスターは母集団の主役でない）', () => {
    const p = prog({ 1: 'mastered', 2: 'mastered', 3: 'unsure', 4: 'failed' });
    // 5..10 は unanswered
    const s = buildChapterSession(qs, p, 'A', {
      order: 'sequential', sessionSize: 0, maintenanceRatio: 0,
    });
    // maintenanceRatio=0 なので mastered は含まれない
    expect(s.map((q) => q.no)).not.toContain(1);
    expect(s.map((q) => q.no)).not.toContain(2);
    // 未マスター8問すべて
    expect(s).toHaveLength(8);
  });

  it('sequential は no 昇順', () => {
    const p = prog({});
    const s = buildChapterSession(qs, p, 'A', { order: 'sequential', sessionSize: 0, maintenanceRatio: 0 });
    expect(s.map((q) => q.no)).toEqual([1,2,3,4,5,6,7,8,9,10]);
  });

  it('sessionSize で上限を切る', () => {
    const p = prog({});
    const s = buildChapterSession(qs, p, 'A', { order: 'sequential', sessionSize: 3, maintenanceRatio: 0 });
    expect(s).toHaveLength(3);
  });

  it('maintenanceRatio>0 でマスターを少量混ぜる', () => {
    const p = prog({ 1: 'mastered', 2: 'mastered', 3: 'mastered', 4: 'unsure', 5: 'failed' });
    // 未マスター: 4,5,6,7,8,9,10 = 7問, ratio 0.3 → floor(7*0.3)=2 のmasteredを追加
    const s = buildChapterSession(qs, p, 'A', { order: 'sequential', sessionSize: 0, maintenanceRatio: 0.3 });
    const masteredIncluded = s.filter((q) => [1,2,3].includes(q.no)).length;
    expect(masteredIncluded).toBe(2);
    expect(s).toHaveLength(9);
  });

  it('random は注入した rng で決定的に', () => {
    const p = prog({});
    const rng = () => 0; // 常に0 → 安定ソート的挙動
    const s = buildChapterSession(qs, p, 'A', { order: 'random', sessionSize: 0, maintenanceRatio: 0, rng });
    expect(s).toHaveLength(10);
  });

  it('全問マスター済み（100%）なら全問を復習対象にする', () => {
    const p = prog({ 1: 'mastered', 2: 'mastered', 3: 'mastered', 4: 'mastered', 5: 'mastered',
      6: 'mastered', 7: 'mastered', 8: 'mastered', 9: 'mastered', 10: 'mastered' });
    const s = buildChapterSession(qs, p, 'A', { order: 'sequential', sessionSize: 0, maintenanceRatio: 0.2 });
    expect(s).toHaveLength(10);
    expect(s.map((q) => q.no)).toEqual([1,2,3,4,5,6,7,8,9,10]);
  });
});

describe('buildUnsureSession', () => {
  it('unsure のみ', () => {
    const p = prog({ 1: 'unsure', 2: 'failed', 3: 'unsure', 4: 'mastered' });
    const s = buildUnsureSession(qs, p, 'A', { order: 'sequential', sessionSize: 0 });
    expect(s.map((q) => q.no).sort()).toEqual([1, 3]);
  });

  it("chapter='all' で全章の unsure", () => {
    const p = prog({ 1: 'unsure' });
    const s = buildUnsureSession(qs, p, 'all', { order: 'sequential', sessionSize: 0 });
    expect(s.map((q) => q.no)).toContain(1);
  });
});
