import type { RoundRecord } from '../domain/types';
import { STATE_COLORS } from '../domain/colors';

interface Props { rounds: RoundRecord[]; total: number; }

const TOP = 14, BOTTOM = 130, LEFT = 34, RIGHT = 290, BARW = 26;

export function StackedBarChart({ rounds, total }: Props) {
  const h = (n: number) => (total === 0 ? 0 : (n / total) * (BOTTOM - TOP));
  const slots = Math.max(rounds.length, 1);
  const step = (RIGHT - LEFT - 20) / slots;

  return (
    <svg viewBox="0 0 300 172" style={{ width: '100%', height: 'auto' }}>
      <line x1={LEFT} y1={TOP} x2={LEFT} y2={BOTTOM} stroke="var(--border)" />
      <line x1={LEFT} y1={BOTTOM} x2={RIGHT} y2={BOTTOM} stroke="var(--border)" />
      {rounds.map((r, i) => {
        const x = LEFT + 12 + i * step;
        const g = h(r.counts.mastered);
        const y = h(r.counts.unsure);
        const rr = h(r.counts.failed);
        const gTop = BOTTOM - g;
        const yTop = gTop - y;
        const rTop = yTop - rr;
        return (
          <g key={r.round}>
            <rect x={x} y={gTop} width={BARW} height={g} fill={STATE_COLORS.mastered} />
            <rect x={x} y={yTop} width={BARW} height={y} fill={STATE_COLORS.unsure} />
            <rect x={x} y={rTop} width={BARW} height={rr} fill={STATE_COLORS.failed} />
            <rect x={x} y={TOP} width={BARW} height={rTop - TOP} fill={STATE_COLORS.unanswered} />
            <text x={x + BARW / 2} y={Math.min(gTop + 11, BOTTOM - 3)}
              fontSize={9} fontWeight={800} fill="#fff" textAnchor="middle">
              {r.masteryPct}%
            </text>
            <text x={x + BARW / 2} y={144} fontSize={8} fill="var(--muted)" textAnchor="middle">
              {r.round}回
            </text>
          </g>
        );
      })}
    </svg>
  );
}
