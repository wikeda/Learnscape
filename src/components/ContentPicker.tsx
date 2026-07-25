import type { Content } from '../domain/types';

interface Props {
  contents: Content[];
  activeId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function ContentPicker({ contents, activeId, onSelect, onDelete, onClose }: Props) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, background: 'var(--surface)',
          borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: '18px 16px 28px',
          maxHeight: '80vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>コンテンツを選ぶ</div>
          <span onClick={onClose} style={{ fontSize: 20, color: 'var(--muted)', cursor: 'pointer' }}>✕</span>
        </div>

        {contents.map((c) => {
          const active = c.id === activeId;
          return (
            <div key={c.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px',
                borderRadius: 12, marginBottom: 8, cursor: 'pointer',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                background: active ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
              }}
              onClick={() => { onSelect(c.id); onClose(); }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{c.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {c.questions.length}問{c.builtin ? '' : '・読み込み'}
                </div>
              </div>
              {active && <span style={{ color: 'var(--accent)', fontWeight: 800 }}>✓</span>}
              {!c.builtin && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`「${c.title}」を削除します。よろしいですか？（進捗も削除されます）`)) onDelete(c.id);
                  }}
                  style={{ fontSize: 12, color: '#d23b3b', padding: '4px 8px', cursor: 'pointer' }}
                >
                  削除
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
