import { describe, it, expect } from 'vitest';
import { recordStudyDay, emptyStreak } from './streak';

describe('recordStudyDay', () => {
  it('初回で current=1, longest=1', () => {
    const r = recordStudyDay(emptyStreak(), '2026-07-23');
    expect(r.current).toBe(1);
    expect(r.longest).toBe(1);
    expect(r.lastStudyDate).toBe('2026-07-23');
  });

  it('同日はもう一度呼んでも変化なし', () => {
    const a = recordStudyDay(emptyStreak(), '2026-07-23');
    const b = recordStudyDay(a, '2026-07-23');
    expect(b.current).toBe(1);
    expect(b.studyDates).toEqual(['2026-07-23']);
  });

  it('翌日で current+1', () => {
    const a = recordStudyDay(emptyStreak(), '2026-07-23');
    const b = recordStudyDay(a, '2026-07-24');
    expect(b.current).toBe(2);
    expect(b.longest).toBe(2);
  });

  it('間が空くと current=1 に戻る（longestは保持）', () => {
    let s = recordStudyDay(emptyStreak(), '2026-07-23');
    s = recordStudyDay(s, '2026-07-24'); // current2
    s = recordStudyDay(s, '2026-07-27'); // 途切れ
    expect(s.current).toBe(1);
    expect(s.longest).toBe(2);
  });
});
