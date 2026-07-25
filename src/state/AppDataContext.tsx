import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { AppData, Settings, SwipeResult, RoundRecord } from '../domain/types';
import { loadAppData, saveAppData } from '../storage/storage';
import { applySwipe, initialProgress } from '../domain/mastery';
import { recordStudyDay, todayStr } from '../domain/streak';

type Action =
  | { type: 'answer'; no: number; result: SwipeResult }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'replace'; data: AppData }
  | { type: 'round'; chapter: string; record: RoundRecord };

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'answer': {
      const prev = state.progress[action.no] ?? initialProgress(action.no);
      const next = applySwipe(prev, action.result, state.settings.masterThreshold, Date.now());
      return {
        ...state,
        progress: { ...state.progress, [action.no]: next },
        streak: recordStudyDay(state.streak, todayStr()),
      };
    }
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'replace':
      return action.data;
    case 'round': {
      const list = state.chapterRounds[action.chapter] ?? [];
      return {
        ...state,
        chapterRounds: { ...state.chapterRounds, [action.chapter]: [...list, action.record] },
      };
    }
    default:
      return state;
  }
}

interface Ctx {
  data: AppData;
  recordAnswer: (no: number, result: SwipeResult) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceData: (data: AppData) => void;
  recordRound: (chapter: string, record: RoundRecord) => void;
}

const AppDataCtx = createContext<Ctx | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined as unknown as AppData, loadAppData);

  useEffect(() => { saveAppData(data); }, [data]);

  useEffect(() => {
    const root = document.documentElement;
    const theme = data.settings.theme === 'system'
      ? (window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light')
      : data.settings.theme;
    root.setAttribute('data-theme', theme);
    root.style.setProperty('--accent', data.settings.accent);
  }, [data.settings.theme, data.settings.accent]);

  const value = useMemo<Ctx>(() => ({
    data,
    recordAnswer: (no, result) => dispatch({ type: 'answer', no, result }),
    updateSettings: (patch) => dispatch({ type: 'settings', patch }),
    replaceData: (d) => dispatch({ type: 'replace', data: d }),
    recordRound: (chapter, record) => dispatch({ type: 'round', chapter, record }),
  }), [data]);

  return <AppDataCtx.Provider value={value}>{children}</AppDataCtx.Provider>;
}

export function useAppData(): Ctx {
  const c = useContext(AppDataCtx);
  if (!c) throw new Error('useAppData must be used within AppDataProvider');
  return c;
}
