import { describe, it, expect } from 'vitest';
import { buildChapterSession, buildUnsureSession, pickByIds } from './session';
import type { Question, QuestionProgress } from './types';

function q(id: string, chapter: string, chapterNo: number): Question {
  return { id, section: 'sec', chapter, chapterNo, question: `Q${id}`, answer: `A${id}` };
}

const qs: Question[] = Array.from({ length: 10 }, (_, i) =>
  q(`S${String(i + 1).padStart(2, '0')}`, 'A', 1));

function prog(map: Record<string, QuestionProgress['state']>): Record<string, QuestionProgress> {
  const p: Record<string, QuestionProgress> = {};
  for (const [id, state] of Object.entries(map)) {
    p[id] = { id, state, knownStreak: 0, lastStudiedAt: 1 };
  }
  return p;
}

describe('buildChapterSession', () => {
  it('未マスター中心（マスターは母集団の主役でない）', () => {
    const p = prog({ S01: 'mastered', S02: 'mastered', S03: 'unsure', S04: 'failed' });
    // S05..S10 は unanswered
    const s = buildChapterSession(qs, p, 'A', {
      order: 'sequential', sessionSize: 0, maintenanceRatio: 0,
    });
    // maintenanceRatio=0 なので mastered は含まれない
    expect(s.map((x) => x.id)).not.toContain('S01');
    expect(s.map((x) => x.id)).not.toContain('S02');
    // 未マスター8問すべて
    expect(s).toHaveLength(8);
  });

  it('sequential は id 昇順', () => {
    const p = prog({});
    const s = buildChapterSession(qs, p, 'A', { order: 'sequential', sessionSize: 0, maintenanceRatio: 0 });
    expect(s.map((x) => x.id)).toEqual(['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09', 'S10']);
  });

  it('sessionSize で上限を切る', () => {
    const p = prog({});
    const s = buildChapterSession(qs, p, 'A', { order: 'sequential', sessionSize: 3, maintenanceRatio: 0 });
    expect(s).toHaveLength(3);
  });

  it('maintenanceRatio>0 でマスターを少量混ぜる', () => {
    const p = prog({ S01: 'mastered', S02: 'mastered', S03: 'mastered', S04: 'unsure', S05: 'failed' });
    // 未マスター: S04,S05,S06,S07,S08,S09,S10 = 7問, ratio 0.3 → floor(7*0.3)=2 のmasteredを追加
    const s = buildChapterSession(qs, p, 'A', { order: 'sequential', sessionSize: 0, maintenanceRatio: 0.3 });
    const masteredIncluded = s.filter((x) => ['S01', 'S02', 'S03'].includes(x.id)).length;
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
    const p = prog({
      S01: 'mastered', S02: 'mastered', S03: 'mastered', S04: 'mastered', S05: 'mastered',
      S06: 'mastered', S07: 'mastered', S08: 'mastered', S09: 'mastered', S10: 'mastered',
    });
    const s = buildChapterSession(qs, p, 'A', { order: 'sequential', sessionSize: 0, maintenanceRatio: 0.2 });
    expect(s).toHaveLength(10);
    expect(s.map((x) => x.id)).toEqual(['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09', 'S10']);
  });
});

describe('buildUnsureSession', () => {
  it('unsure のみ', () => {
    const p = prog({ S01: 'unsure', S02: 'failed', S03: 'unsure', S04: 'mastered' });
    const s = buildUnsureSession(qs, p, 'A', { order: 'sequential', sessionSize: 0 });
    expect(s.map((x) => x.id).sort()).toEqual(['S01', 'S03']);
  });

  it("chapter='all' で全章の unsure", () => {
    const p = prog({ S01: 'unsure' });
    const s = buildUnsureSession(qs, p, 'all', { order: 'sequential', sessionSize: 0 });
    expect(s.map((x) => x.id)).toContain('S01');
  });
});

describe('pickByIds', () => {
  it('指定したidのみをid昇順で抽出する', () => {
    const r = pickByIds(qs, ['S05', 'S01', 'S03']);
    expect(r.map((x) => x.id)).toEqual(['S01', 'S03', 'S05']);
  });
});
