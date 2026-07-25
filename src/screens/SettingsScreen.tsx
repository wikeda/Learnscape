import { useRef } from 'react';
import { useAppData } from '../state/AppDataContext';
import { exportJson, importJson } from '../storage/storage';
import { defaultAppData } from '../storage/schema';
import type { Theme, Order, SessionSize } from '../domain/types';
import { isHapticSupported } from '../hooks/useHaptic';
import { parseContent } from '../domain/content';

const ACCENTS = ['#3b6cff', '#3f9e5a', '#7a3bff', '#f0993c', '#e5679a', '#20b0b0'];
const SIZES: { v: SessionSize; label: string }[] = [
  { v: 0, label: '制限なし' }, { v: 10, label: '10' }, { v: 20, label: '20' }, { v: 30, label: '30' },
];

export function SettingsScreen() {
  const { data, updateSettings, replaceData, contents, importContent, deleteContent } = useAppData();
  const s = data.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const contentFileRef = useRef<HTMLInputElement>(null);

  function doImportContent(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = ''; // 同一ファイル再選択を許可
    if (!f) return;
    f.text().then((t) => {
      let raw: unknown;
      try { raw = JSON.parse(t); }
      catch { alert('JSONの読み込みに失敗しました（形式が不正です）'); return; }
      const r = parseContent(raw);
      if (!r.ok || !r.content) { alert(`コンテンツの読み込みに失敗しました：\n${r.error}`); return; }
      if (r.content.builtin) { alert('初期搭載と競合するため読み込めません'); return; }
      importContent(r.content);
      alert(`「${r.content.title}」を読み込みました（${r.content.questions.length}問）`);
    });
  }

  function doExport() {
    const blob = new Blob([exportJson(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `learnscape-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  }
  function doImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then((t) => {
      try { replaceData(importJson(t)); alert('進捗を復元しました'); }
      catch { alert('ファイルが不正です'); }
    });
  }
  function doReset() {
    if (window.confirm('学習の進捗をすべてリセットします。この操作は取り消せません。よろしいですか？')) {
      replaceData(defaultAppData());
      alert('進捗をリセットしました');
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 18 }}>設定</h1>

      <Section title="表示">
        <Row label="テーマ">
          <Segmented<Theme> value={s.theme}
            options={[['light', 'ライト'], ['dark', 'ダーク'], ['system', '端末に合わせる']]}
            onChange={(theme) => updateSettings({ theme })} />
        </Row>
        <Row label="アクセントカラー">
          <div style={{ display: 'flex', gap: 10 }}>
            {ACCENTS.map((c) => (
              <div key={c} onClick={() => updateSettings({ accent: c })}
                style={{ width: 26, height: 26, borderRadius: '50%', background: c,
                  boxShadow: s.accent === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : undefined, cursor: 'pointer' }} />
            ))}
          </div>
        </Row>
      </Section>

      <Section title="学習">
        <Row label="出題順">
          <Segmented<Order> value={s.order}
            options={[['sequential', '順番'], ['random', 'ランダム']]}
            onChange={(order) => updateSettings({ order })} />
        </Row>
        <Row label="1セッションの問題数">
          <Segmented<SessionSize> value={s.sessionSize}
            options={SIZES.map((x) => [x.v, x.label] as [SessionSize, string])}
            onChange={(sessionSize) => updateSettings({ sessionSize })} />
        </Row>
        <Row label="マスター判定">
          <Segmented<1 | 2> value={s.masterThreshold}
            options={[[2, '覚えた2回'], [1, '1回']]}
            onChange={(masterThreshold) => updateSettings({ masterThreshold })} />
        </Row>
        <Row label="振動フィードバック">
          <Segmented<boolean> value={s.hapticEnabled}
            options={[[true, 'ON'], [false, 'OFF']]}
            onChange={(hapticEnabled) => updateSettings({ hapticEnabled })} />
          {!isHapticSupported() && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
              この端末は振動に対応していません
            </div>
          )}
        </Row>
      </Section>

      <Section title="コンテンツ">
        <div onClick={() => contentFileRef.current?.click()} style={rowBtn}>コンテンツを読み込む（JSON）</div>
        {contents.map((c, i) => (
          <div key={c.id} style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8,
            borderBottom: i < contents.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13 }}>{c.title}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.questions.length}問{c.builtin ? '・初期搭載' : ''}</div>
            </div>
            {!c.builtin && (
              <span onClick={() => { if (window.confirm(`「${c.title}」を削除しますか？（進捗も削除されます）`)) deleteContent(c.id); }}
                style={{ fontSize: 12, color: '#d23b3b', cursor: 'pointer' }}>削除</span>
            )}
          </div>
        ))}
        <input ref={contentFileRef} type="file" accept="application/json,.json" hidden onChange={doImportContent} />
      </Section>

      <Section title="データ">
        <div onClick={doExport} style={rowBtn}>進捗をエクスポート（バックアップ）</div>
        <div onClick={() => fileRef.current?.click()} style={rowBtn}>進捗をインポート（復元）</div>
        <div onClick={doReset} style={{ ...rowBtn, color: '#d23b3b', borderBottom: 'none' }}>進捗をリセット</div>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={doImport} />
      </Section>

      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--muted)', margin: '16px 0' }}>Learnscape ・ v1.3.2</div>
    </div>
  );
}

const rowBtn: React.CSSProperties = { padding: '12px 14px', fontSize: 13, borderBottom: '1px solid var(--border)', cursor: 'pointer' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <div style={{ fontSize: 11, color: 'var(--muted)', margin: '16px 2px 6px' }}>{title}</div>
      <div style={{ background: 'var(--surface)', borderRadius: 14, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>{children}</div>
    </>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 13, marginBottom: 8 }}>{label}</div>{children}
    </div>
  );
}
function Segmented<T extends string | number | boolean>({ value, options, onChange }:
  { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', fontSize: 11, flexWrap: 'wrap' }}>
      {options.map(([v, label]) => (
        <span key={String(v)} onClick={() => onChange(v)}
          style={{ padding: '6px 12px', cursor: 'pointer',
            background: value === v ? 'var(--accent)' : 'transparent',
            color: value === v ? '#fff' : 'var(--muted)', fontWeight: value === v ? 700 : 400 }}>
          {label}
        </span>
      ))}
    </div>
  );
}
