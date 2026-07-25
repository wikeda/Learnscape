import { useEffect, useRef, useState } from 'react';
import type { Question, SwipeResult } from '../domain/types';

interface Props {
  question: Question;
  onJudge: (result: SwipeResult) => void;
}

export function Flashcard({ question, onJudge }: Props) {
  const [reveal, setReveal] = useState(0); // 0..1 絞り進捗
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const start = useRef<{ x: number; y: number } | null>(null);
  const THRESHOLD = 90;

  // 状態リセットは親が問題ごとに key を変えて再マウントすることで行う（StudyScreen 参照）。
  // effect でリセットすると描画後の実行になり、次の問題の解答が一瞬鮮明に見えてしまう。
  // さらに filter/opacity のトランジションが「表示→ぼかし」を再生してしまうため、
  // 新しい要素として作り直すのが正しい。

  // キーボード操作（PC）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onJudge('known');
      else if (e.key === 'ArrowUp') onJudge('unsure');
      else if (e.key === 'ArrowLeft') onJudge('failed');
      else if (e.key === 'ArrowDown') setReveal(1);
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
    if (dy > 0) setReveal(Math.min(dy / 160, 1));
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
        <div style={{ fontSize: 17, lineHeight: 1.6, marginTop: 8 }}>{question.question}</div>
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px dashed var(--border)' }}>
        <div style={{ fontSize: 10, letterSpacing: '.08em', color: 'var(--muted)' }}>解答</div>
        <div style={{
          fontSize: 24, fontWeight: 700, marginTop: 6, color: 'var(--accent)',
          filter: `blur(${9 - 9 * reveal}px)`, opacity: 0.25 + 0.75 * reveal,
          transition: start.current ? 'none' : 'filter .2s, opacity .2s',
        }}>{question.answer}</div>
      </div>
    </div>
  );
}
