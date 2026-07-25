import { useEffect, useRef, useState } from 'react';
import type { Question, SwipeResult } from '../domain/types';

interface Props {
  question: Question;
  onJudge: (result: SwipeResult) => void;
}

// 鮮明化の段階境界。0..STAGE で正解、STAGE..1 で解説・ポイントを鮮明化する。
const STAGE = 0.55;

export function Flashcard({ question, onJudge }: Props) {
  const [reveal, setReveal] = useState(0); // 0..1
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const start = useRef<{ x: number; y: number } | null>(null);
  const THRESHOLD = 90;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onJudge('known');
      else if (e.key === 'ArrowUp') onJudge('unsure');
      else if (e.key === 'ArrowLeft') onJudge('failed');
      // ↓1回目で正解、2回目で解説・ポイントまで
      else if (e.key === 'ArrowDown') setReveal((r) => (r < STAGE ? STAGE : 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onJudge]);

  function pointerDown(e: React.PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function pointerMove(e: React.PointerEvent) {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    setDrag({ x: dx, y: dy });
    if (dy > 0) setReveal(Math.min(dy / 220, 1)); // 220pxで全鮮明化（2段階ぶんの余裕）
  }
  function pointerUp() {
    if (!start.current) return;
    const { x, y } = drag;
    if (Math.abs(x) > Math.abs(y) && Math.abs(x) > THRESHOLD) {
      onJudge(x > 0 ? 'known' : 'failed');
    } else if (y < -THRESHOLD) {
      onJudge('unsure');
    }
    start.current = null;
    setDrag({ x: 0, y: 0 });
  }

  // 段階1: 正解 / 段階2: 解説・ポイント
  const answerReveal = Math.min(reveal / STAGE, 1);
  const detailReveal = Math.max(0, Math.min((reveal - (1 - STAGE)) / STAGE, 1));
  const trans = start.current ? 'none' : 'filter .2s, opacity .2s';

  return (
    <div
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      style={{
        transform: `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 18}deg)`,
        touchAction: 'none', userSelect: 'none',
        background: 'var(--surface)', borderRadius: 22, padding: '26px 20px',
        boxShadow: '0 8px 24px rgba(0,0,0,.15)',
        minHeight: 340, display: 'flex', flexDirection: 'column',
      }}
    >
      <div>
        <div style={{ fontSize: 10, letterSpacing: '.08em', color: 'var(--muted)' }}>問題</div>
        <div style={{ fontSize: 17, lineHeight: 1.6, marginTop: 8, whiteSpace: 'pre-wrap' }}>{question.question}</div>
        {question.choices && (
          <div style={{ fontSize: 14, lineHeight: 1.7, marginTop: 12, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
            {question.choices}
          </div>
        )}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px dashed var(--border)' }}>
        <div style={{ fontSize: 10, letterSpacing: '.08em', color: 'var(--muted)' }}>解答</div>
        <div style={{
          fontSize: 24, fontWeight: 700, marginTop: 6, color: 'var(--accent)',
          filter: `blur(${9 - 9 * answerReveal}px)`, opacity: 0.25 + 0.75 * answerReveal,
          transition: trans,
        }}>{question.answer}</div>

        {(question.explanation || question.point) && (
          <div style={{
            marginTop: 10,
            filter: `blur(${7 - 7 * detailReveal}px)`, opacity: 0.15 + 0.85 * detailReveal,
            transition: trans,
          }}>
            {question.explanation && (
              <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text)' }}>{question.explanation}</div>
            )}
            {question.point && (
              <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--muted)', marginTop: 6 }}>
                💡 {question.point}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
