const PIECES = [
  { top: 22, left: 28, c: '#3f9e5a', r: 20 }, { top: 38, left: 250, c: '#e6b800', r: -15 },
  { top: 66, left: 56, c: '#e5736b', r: 0 },  { top: 54, left: 220, c: '#3b6cff', r: 30 },
  { top: 30, left: 120, c: '#7a3bff', r: 45 }, { top: 80, left: 265, c: '#f0993c', r: -25 },
  { top: 92, left: 38, c: '#e5679a', r: 15 },  { top: 44, left: 88, c: '#20b0b0', r: -40 },
];

export function Confetti() {
  return (
    <>
      {PIECES.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', top: p.top, left: p.left, width: 6, height: 6,
          background: p.c, borderRadius: 2, transform: `rotate(${p.r}deg)`, pointerEvents: 'none',
        }} />
      ))}
    </>
  );
}
