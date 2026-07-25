interface Props {
  onClick: () => void;
}

/** 画面共通の戻るボタン。タップ領域を確保し、ボタンだと分かる見た目にする */
export function BackButton({ onClick }: Props) {
  return (
    <button onClick={onClick} aria-label="戻る"
      style={{
        width: 38, height: 38, borderRadius: 12, padding: 0, flexShrink: 0,
        border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}
