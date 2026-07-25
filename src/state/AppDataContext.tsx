import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type {
  AppData, Settings, SwipeResult, RoundRecord, Content, Question,
  QuestionProgress,
} from '../domain/types';
import { loadAppData, saveAppData } from '../storage/storage';
import { applySwipe, initialProgress } from '../domain/mastery';
import { recordStudyDay, todayStr } from '../domain/streak';
import { allContents, activeContentOf, DEFAULT_CONTENT_ID } from '../data/contents';

type Action =
  | { type: 'answer'; id: string; result: SwipeResult }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'replace'; data: AppData }
  | { type: 'round'; chapter: string; record: RoundRecord }
  | { type: 'setActive'; id: string }
  | { type: 'importContent'; content: Content }
  | { type: 'deleteContent'; id: string };

function emptyCP() { return { progress: {}, chapterRounds: {} }; }

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'answer': {
      const cid = state.activeContentId;
      const cp = state.byContent[cid] ?? emptyCP();
      const prev = cp.progress[action.id] ?? initialProgress(action.id);
      const next = applySwipe(prev, action.result, state.settings.masterThreshold, Date.now());
      return {
        ...state,
        byContent: { ...state.byContent, [cid]: { ...cp, progress: { ...cp.progress, [action.id]: next } } },
        streak: recordStudyDay(state.streak, todayStr()),
      };
    }
    case 'round': {
      const cid = state.activeContentId;
      const cp = state.byContent[cid] ?? emptyCP();
      const list = cp.chapterRounds[action.chapter] ?? [];
      return {
        ...state,
        byContent: { ...state.byContent, [cid]: { ...cp, chapterRounds: { ...cp.chapterRounds, [action.chapter]: [...list, action.record] } } },
      };
    }
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'replace':
      return action.data;
    case 'setActive':
      return { ...state, activeContentId: action.id };
    case 'importContent': {
      const c = action.content;
      const others = state.importedContents.filter((x) => x.id !== c.id);
      return { ...state, importedContents: [...others, c], activeContentId: c.id };
    }
    case 'deleteContent': {
      const importedContents = state.importedContents.filter((c) => c.id !== action.id);
      const byContent = { ...state.byContent };
      delete byContent[action.id];
      const activeContentId = state.activeContentId === action.id ? DEFAULT_CONTENT_ID : state.activeContentId;
      return { ...state, importedContents, byContent, activeContentId };
    }
    default:
      return state;
  }
}

interface Ctx {
  data: AppData;
  contents: Content[];
  activeContent: Content;
  questions: Question[];
  progress: Record<string, QuestionProgress>;
  chapterRounds: Record<string, RoundRecord[]>;
  recordAnswer: (id: string, result: SwipeResult) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceData: (data: AppData) => void;
  recordRound: (chapter: string, record: RoundRecord) => void;
  setActiveContent: (id: string) => void;
  importContent: (content: Content) => void;
  deleteContent: (id: string) => void;
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

  const value = useMemo<Ctx>(() => {
    const activeContent = activeContentOf(data);
    const cp = data.byContent[data.activeContentId] ?? emptyCP();
    return {
      data,
      contents: allContents(data),
      activeContent,
      questions: activeContent.questions,
      progress: cp.progress,
      chapterRounds: cp.chapterRounds,
      recordAnswer: (id, result) => dispatch({ type: 'answer', id, result }),
      updateSettings: (patch) => dispatch({ type: 'settings', patch }),
      replaceData: (d) => dispatch({ type: 'replace', data: d }),
      recordRound: (chapter, record) => dispatch({ type: 'round', chapter, record }),
      setActiveContent: (id) => dispatch({ type: 'setActive', id }),
      importContent: (content) => dispatch({ type: 'importContent', content }),
      deleteContent: (id) => dispatch({ type: 'deleteContent', id }),
    };
  }, [data]);

  return <AppDataCtx.Provider value={value}>{children}</AppDataCtx.Provider>;
}

export function useAppData(): Ctx {
  const c = useContext(AppDataCtx);
  if (!c) throw new Error('useAppData must be used within AppDataProvider');
  return c;
}
