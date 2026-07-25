import type { AppData, Content } from '../../domain/types';
import jp from './japanese-history.json';
import wh from './world-history.json';

// JSONは schemaVersion/id/title/questions を持つ。builtin=true を付与して Content 化する。
function asBuiltin(raw: unknown): Content {
  const o = raw as Omit<Content, 'builtin'>;
  return { ...o, builtin: true };
}

export const BUILTIN_CONTENTS: Content[] = [asBuiltin(wh), asBuiltin(jp)];
export const DEFAULT_CONTENT_ID = 'world-history';

export function allContents(data: AppData): Content[] {
  return [...BUILTIN_CONTENTS, ...data.importedContents];
}

export function activeContentOf(data: AppData): Content {
  const all = allContents(data);
  return all.find((c) => c.id === data.activeContentId) ?? all[0];
}
