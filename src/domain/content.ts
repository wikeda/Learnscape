import type { Content, Question } from './types';

export const CONTENT_SCHEMA_VERSION = 1;

export interface ParseResult {
  ok: boolean;
  content?: Content;   // builtin=false で返す
  error?: string;
}

function str(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
}
function optStr(v: unknown): string | null {
  if (v == null) return null;
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

export function parseContent(raw: unknown, builtin = false): ParseResult {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'JSONがオブジェクトではありません' };
  const o = raw as Record<string, unknown>;

  if (o.schemaVersion !== CONTENT_SCHEMA_VERSION) {
    return { ok: false, error: `未対応の schemaVersion です（対応: ${CONTENT_SCHEMA_VERSION}）` };
  }
  const id = str(o.id);
  const title = str(o.title);
  if (!id) return { ok: false, error: 'id が空です' };
  if (!title) return { ok: false, error: 'title が空です' };
  if (!Array.isArray(o.questions) || o.questions.length === 0) {
    return { ok: false, error: 'questions が空です' };
  }

  const questions: Question[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < o.questions.length; i++) {
    const q = o.questions[i] as Record<string, unknown>;
    const qid = str(q?.id);
    const section = str(q?.section);
    const chapter = str(q?.chapter);
    const chapterNo = typeof q?.chapterNo === 'number' ? q.chapterNo : NaN;
    const question = str(q?.question);
    const answer = str(q?.answer);
    const missing: string[] = [];
    if (!qid) missing.push('id');
    if (!section) missing.push('section');
    if (!chapter) missing.push('chapter');
    if (Number.isNaN(chapterNo)) missing.push('chapterNo');
    if (!question) missing.push('question');
    if (!answer) missing.push('answer');
    if (missing.length > 0) {
      return { ok: false, error: `questions[${i}] の必須フィールドが不足: ${missing.join(', ')}` };
    }
    if (seen.has(qid!)) return { ok: false, error: `問題IDが重複しています: ${qid}` };
    seen.add(qid!);
    questions.push({
      id: qid!, section: section!, chapter: chapter!, chapterNo,
      difficulty: optStr(q.difficulty) ?? undefined,
      format: optStr(q.format) ?? undefined,
      question: question!,
      choices: optStr(q.choices),
      answer: answer!,
      explanation: optStr(q.explanation),
      point: optStr(q.point),
    });
  }

  return { ok: true, content: { schemaVersion: CONTENT_SCHEMA_VERSION, id, title, builtin, questions } };
}
