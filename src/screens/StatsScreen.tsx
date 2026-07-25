import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuestions } from '../hooks/useQuestions';
import { useAppData } from '../state/AppDataContext';
import { chapterList, countStates, masteryPct, overallMastery } from '../domain/aggregate';
import { MasteryRing } from '../components/MasteryRing';
import { masteryColor } from '../domain/colors';

type SortMode = 'weak' | 'chapter';

export function StatsScreen() {
  const nav = useNavigate();
  const questions = useQuestions();
  const { data } = useAppData();
  const chapters = chapterList(questions);
  const overall = overallMastery(questions, data.progress);
  const [sort, setSort] = useState<SortMode>('weak');

  const rows = chapters.map((c) => ({ c, pct: masteryPct(countStates(questions, data.progress, c)) }));
  const sorted = sort === 'weak' ? [...rows].sort((a, b) => a.pct - b.pct) : rows;

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 18 }}>成績</h1>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'var(--surface)', borderRadius: 18, padding: 16, boxShadow: 'var(--shadow)' }}>
        <MasteryRing pct={overall.pct} size={70} />
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>全体の習熟度</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{overall.mastered} / {overall.total} 問マスター</div>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 14, marginTop: 12, boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ fontWeight: 700 }}>🔥 ストリーク</span>
          <span style={{ color: 'var(--muted)' }}>現在 {data.streak.current} / 最長 {data.streak.longest}</span>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 2px 8px' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>章別の習熟度（全{chapters.length}章）</span>
          <span style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden', fontSize: 11 }}>
            <span onClick={() => setSort('weak')}
              style={{ padding: '5px 11px', cursor: 'pointer', background: sort === 'weak' ? 'var(--accent)' : 'transparent', color: sort === 'weak' ? '#fff' : 'var(--muted)', fontWeight: sort === 'weak' ? 700 : 400 }}>苦手順</span>
            <span onClick={() => setSort('chapter')}
              style={{ padding: '5px 11px', cursor: 'pointer', background: sort === 'chapter' ? 'var(--accent)' : 'transparent', color: sort === 'chapter' ? '#fff' : 'var(--muted)', fontWeight: sort === 'chapter' ? 700 : 400 }}>章順</span>
          </span>
        </div>
        <div style={{ background: 'var(--surface)', borderRadius: 14, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          {sorted.map((r, i) => (
            <div key={r.c} onClick={() => nav(`/chapter/${encodeURIComponent(r.c)}`)}
              style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: masteryColor(r.pct), flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13 }}>{r.c}</span>
              {r.pct >= 100
                ? <span style={{ fontSize: 15 }}>🏆</span>
                : <span style={{ fontSize: 13, fontWeight: 800, color: masteryColor(r.pct) }}>{r.pct}<span style={{ fontSize: 9 }}>%</span></span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
