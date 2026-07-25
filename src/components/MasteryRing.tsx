interface Props { pct: number; size?: number; color?: string; }

export function MasteryRing({ pct, size = 56, color = 'var(--accent)' }: Props) {
  const C = 2 * Math.PI * 15.5;
  const offset = C * (1 - pct / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg viewBox="0 0 36 36" width={size} height={size}>
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border)" strokeWidth="3.5" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={C} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 18 18)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontWeight: 800 }}>
        <span style={{ fontSize: size * 0.27 }}>{pct}</span>
        <span style={{ fontSize: size * 0.16, opacity: 0.7, marginLeft: 1 }}>%</span>
      </div>
    </div>
  );
}
