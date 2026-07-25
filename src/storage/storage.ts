import type { AppData } from '../domain/types';
import { defaultAppData, DEFAULT_SETTINGS, DATA_VERSION } from './schema';

const KEY = 'whq:data';

function mergeDefaults(raw: Partial<AppData>): AppData {
  const base = defaultAppData();
  return {
    version: DATA_VERSION,
    progress: raw.progress ?? base.progress,
    chapterRounds: raw.chapterRounds ?? base.chapterRounds,
    streak: { ...base.streak, ...(raw.streak ?? {}) },
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) },
  };
}

export function loadAppData(): AppData {
  const s = localStorage.getItem(KEY);
  if (!s) return defaultAppData();
  try {
    return mergeDefaults(JSON.parse(s));
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
  const parsed = JSON.parse(json); // 不正なら例外を投げる
  return mergeDefaults(parsed);
}
