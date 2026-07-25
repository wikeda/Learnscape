import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { filterQuestions } from '../domain/browse';
import { BackButton } from '../components/BackButton';
import { STATE_COLORS } from '../domain/colors';
import type { MasteryState } from '../domain/types';

const ALL_STATES: MasteryState[] = ['mastered', 'unsure', 'failed', 'unanswered'];
const STATE_LABEL: Record<MasteryState, string> = {
  mastered: 'マスター',
  unsure: 'あやふや',
  failed: 'できなかった',
  unanswered: '未回答',
};

/** 伏せ字の幅は全問共通。解答の長さから答えを推測させないため */
const MASK_WIDTH = 96;

export function QuestionListScreen() {
  const { chapter = '' } = useParams();
  const nav = useNavigate();
  const { questions, progress } = useAppData();

  const [hidden, setHidden] = useState(true); // 既定は「解答を隠す」（暗記用途のため）
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [states, setStates] = useState<MasteryState[]>(ALL_STATES);
  const [filterOpen, setFilterOpen] = useState(false);

  const total = questions.filter((q) => q.chapter === chapter).length;
  const list = useMemo(
    () => filterQuestions(questions, progress, chapter, states),
    [questions, progress, chapter, states],
  );

  function toggleHidden() {
    setHidden((h) => !h);
    setRevealed(new Set()); // 一括切替で個別の開閉はリセットする
  }

  function tapRow(id: string) {
    if (!hidden) return; // 表示中は無反応
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleState(s: MasteryState) {
    setStates((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  return (
    <div style={{ padding: '18px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton onClick={() => nav(-1)} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{chapter}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {list.length === total ? `${total}問` : `${list.length}問 / 全${total}問`}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={toggleHidden}
          style={{ flex: 1, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: 9, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
          {hidden ? '🔓 解答を表示' : '🔒 解答を隠す'}
        </button>
        <button onClick={() => setFilterOpen((o) => !o)}
          style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', fontSize: 12, cursor: 'pointer' }}>
          絞り込み ▾
        </button>
      </div>

      {filterOpen && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, background: 'var(--surface)', borderRadius: 12, padding: 12, boxShadow: 'var(--shadow)' }}>
          {ALL_STATES.map((s) => {
            const on = states.includes(s);
            return (
              <span key={s} onClick={() => toggleState(s)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 11px', borderRadius: 20, cursor: 'pointer',
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                  color: on ? 'var(--accent)' : 'var(--muted)', fontWeight: on ? 700 : 400 }}>
                <i style={{ width: 8, height: 8, borderRadius: 2, background: STATE_COLORS[s], display: 'inline-block' }} />
                {STATE_LABEL[s]}
              </span>
            );
          })}
        </div>
      )}

      {list.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '48px 0' }}>
          該当する問題がありません
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', borderRadius: 14, boxShadow: 'var(--shadow)', overflow: 'hidden', marginTop: 12 }}>
          {list.map((q, i) => {
            const state: MasteryState = progress[q.id]?.state ?? 'unanswered';
            const show = !hidden || revealed.has(q.id);
            return (
              <div key={q.id} onClick={() => tapRow(q.id)}
                style={{ padding: '11px 13px', display: 'flex', gap: 9,
                  borderBottom: i < list.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: hidden ? 'pointer' : 'default' }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: STATE_COLORS[state], marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, lineHeight: 1.55 }}>{q.question}</div>
                  {show ? (
                    <div style={{ marginTop: 5, textAlign: 'right', fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>
                      {q.answer}
                    </div>
                  ) : (
                    <div style={{ marginTop: 6, marginLeft: 'auto', width: MASK_WIDTH, height: 21, background: 'var(--border)', borderRadius: 6 }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
