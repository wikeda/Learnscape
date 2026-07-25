import { useNavigate, useParams } from 'react-router-dom';
import { useQuestions } from '../hooks/useQuestions';
import { useAppData } from '../state/AppDataContext';
import { countStates, masteryPct } from '../domain/aggregate';
import { BackButton } from '../components/BackButton';
import { StackedBarChart } from '../components/StackedBarChart';

export function ChapterDetailScreen() {
  const { chapter = '' } = useParams();
  const nav = useNavigate();
  const questions = useQuestions();
  const { data } = useAppData();

  const total = questions.filter((q) => q.chapter === chapter).length;
  const counts = countStates(questions, data.progress, chapter);
  const pct = masteryPct(counts);
  const rounds = data.chapterRounds[chapter] ?? [];
  const complete = pct >= 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', padding: '18px 16px 196px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton onClick={() => nav(-1)} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{chapter}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{total}問</div>
        </div>
        <div style={{ fontWeight: 800, fontSize: 20, color: complete ? '#b8860b' : '#3f9e5a' }}>
          {complete ? '🏆 ' : ''}{pct}<span style={{ fontSize: 11, opacity: 0.7 }}>%</span>
        </div>
      </div>

      {/* 内訳バー */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', height: 8, borderRadius: 5, overflow: 'hidden', background: 'var(--border)' }}>
          {counts.mastered > 0 && <div style={{ width: `${(counts.mastered / total) * 100}%`, background: '#3f9e5a' }} />}
          {counts.unsure > 0 && <div style={{ width: `${(counts.unsure / total) * 100}%`, background: '#e6b800' }} />}
          {counts.failed > 0 && <div style={{ width: `${(counts.failed / total) * 100}%`, background: '#e5736b' }} />}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
          <span>🟢 マスター {counts.mastered}</span>
          <span>🟡 あやふや {counts.unsure}</span>
          <span>🔴 できなかった {counts.failed}</span>
          <span>⚪ 未回答 {counts.unanswered}</span>
        </div>
      </div>

      {/* グラフ（中央寄せで間延び解消） */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', marginTop: 16 }}>
        <div style={{ width: '100%', background: 'var(--surface)', borderRadius: 18, padding: '18px 14px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>この章の伸び 📈</div>
          {rounds.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--muted)', padding: '28px 0', textAlign: 'center' }}>学習するとここに伸びが記録されます</div>
            : <StackedBarChart rounds={rounds} total={total} />}
        </div>
      </div>

      {/* アクション（最下部固定・他画面と整合） */}
      <div style={{ position: 'fixed', bottom: 18, left: 16, right: 16, maxWidth: 448, margin: '0 auto' }}>
        {counts.unsure > 0 && (
          <button onClick={() => nav(`/study/unsure/${encodeURIComponent(chapter)}`)}
            style={{ width: '100%', background: 'var(--surface)', border: '1px solid #f2e2b0', color: '#c98a00', borderRadius: 14, padding: 12, fontWeight: 800, marginBottom: 10, cursor: 'pointer' }}>
            ⚡ あやふや {counts.unsure}問だけ
          </button>
        )}
        <button onClick={() => nav(`/chapter/${encodeURIComponent(chapter)}/questions`)}
          style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 14, padding: 12, fontWeight: 800, marginBottom: 10, cursor: 'pointer' }}>
          📖 一覧で見る
        </button>
        <button className="btn-primary" onClick={() => nav(`/study/chapter/${encodeURIComponent(chapter)}`)}>
          {complete ? '🔁 もう一度ぜんぶ復習する' : '▶ この章を学習'}
        </button>
      </div>
    </div>
  );
}
