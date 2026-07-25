import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { contentStructure, countStates, masteryPct, overallMastery } from '../domain/aggregate';
import { masteryColor } from '../domain/colors';
import { MasteryRing } from '../components/MasteryRing';
import { ContentPicker } from '../components/ContentPicker';

export function HomeScreen() {
  const nav = useNavigate();
  const { data, questions, progress, activeContent, contents, setActiveContent, deleteContent } = useAppData();
  const [pickerOpen, setPickerOpen] = useState(false);

  const structure = contentStructure(questions);
  const chapters = structure.flatMap((g) => g.chapters);
  const overall = overallMastery(questions, progress);
  const completed = chapters.filter((c) => masteryPct(countStates(questions, progress, c)) >= 100).length;
  const unsureCount = Object.values(progress).filter((p) => p.state === 'unsure').length;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h1
          onClick={() => setPickerOpen(true)}
          style={{ fontSize: 18, margin: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          {activeContent.title} 実績マップ
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>▾</span>
        </h1>
        <span style={{ fontSize: 13, color: '#e8622b' }}>🔥 {data.streak.current}</span>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center', background: 'var(--surface)', borderRadius: 16, padding: 14, boxShadow: 'var(--shadow)' }}>
        <MasteryRing pct={overall.pct} />
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>全体の習熟度</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{overall.mastered} / {overall.total} 問マスター</div>
          <div style={{ fontSize: 11, color: '#b8860b' }}>🏆 コンプ章 {completed} / {chapters.length}</div>
        </div>
      </div>

      {unsureCount > 0 && (
        <div onClick={() => nav('/study/unsure/all')} style={{ marginTop: 12, padding: '12px 15px', borderRadius: 15, background: '#fff8e6', border: '1px solid #f2e2b0', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
          <span style={{ fontWeight: 800, color: '#c98a00' }}>⚡ あやふや復習</span>
          <span style={{ color: '#a98a3a' }}>{unsureCount}問</span>
        </div>
      )}

      {structure.map((group) => (
        <div key={group.section} style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '0 2px 8px' }}>{group.section}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>
            {group.chapters.map((c) => {
              const pct = masteryPct(countStates(questions, progress, c));
              const bg = masteryColor(pct);
              const textColor = pct >= 100 ? '#5a3d00' : pct === 0 ? '#5a6376' : '#fff';
              return (
                <div key={c} onClick={() => nav(`/chapter/${encodeURIComponent(c)}`)}
                  style={{ background: bg, borderRadius: 11, padding: '8px 4px', textAlign: 'center', color: textColor,
                    cursor: 'pointer', minHeight: 62, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 8.5, lineHeight: 1.15, opacity: 0.95, wordBreak: 'break-word' }}>{c}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, marginTop: 3, lineHeight: 1 }}>
                    {pct >= 100 ? '🏆' : <>{pct}<span style={{ fontSize: 11, opacity: 0.75 }}>%</span></>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {pickerOpen && (
        <ContentPicker
          contents={contents}
          activeId={activeContent.id}
          onSelect={setActiveContent}
          onDelete={deleteContent}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
