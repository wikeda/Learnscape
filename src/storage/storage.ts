import type { AppData } from '../domain/types';
import { defaultAppData, DEFAULT_SETTINGS, DATA_VERSION } from './schema';
import { DEFAULT_CONTENT_ID } from '../data/contents';

const KEY = 'learnscape:data';

function mergeDefaults(raw: Partial<AppData>): AppData {
  const base = defaultAppData();
  return {
    version: DATA_VERSION,
    activeContentId: raw.activeContentId ?? DEFAULT_CONTENT_ID,
    importedContents: Array.isArray(raw.importedContents) ? raw.importedContents : base.importedContents,
    byContent: (raw.byContent && typeof raw.byContent === 'object') ? raw.byContent : base.byContent,
    streak: { ...base.streak, ...(raw.streak ?? {}) },
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) },
  };
}

export function loadAppData(): AppData {
  const s = localStorage.getItem(KEY);
  if (!s) return defaultAppData();
  try {
    const parsed = JSON.parse(s) as Partial<AppData>;
    // 旧スキーマ(v1)は移行せず破棄（Learnscapeは新規デプロイ）
    if (parsed.version !== DATA_VERSION) return defaultAppData();
    return mergeDefaults(parsed);
  } catch {
    return defaultAppData();
  }
}

export function saveAppData(data: AppData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function exportJson(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function importJson(json: string): AppData {
  const parsed = JSON.parse(json);
  return mergeDefaults(parsed);
}
